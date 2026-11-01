import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import {
  users,
  doctorProfiles,
  doctorPatients,
  diseaseScans,
  healthMetrics,
  medicalReports,
  doctorPatientChats,
  conversations,
} from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { uploadToR2 } from '../utils/r2.js';
import { broadcastChatMessage } from '../chatSocket.js';

const router = Router();

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// Middleware to extract authenticated user from proxy headers
const authenticateProxyUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Missing x-user-id header.' });
  }

  req.user = {
    id: userId,
    role: userRole,
  };
  next();
};

// ==========================================
// 1. PROXY ENDPOINTS (Models & Chatbot)
// ==========================================

async function streamProxy(targetBaseUrl, req, res) {
  // Strip '/models' or '/chatbot' prefix from path
  const subPath = req.path.replace(/^\/(models|chatbot)/, '');
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const targetUrl = `${targetBaseUrl}${subPath}${queryString}`;

  const headers = {};
  Object.keys(req.headers).forEach((key) => {
    if (![
      'host',
      'connection',
      'content-length',
      'expect',
      'keep-alive',
      'transfer-encoding',
      'te',
      'upgrade'
    ].includes(key.toLowerCase())) {
      headers[key] = req.headers[key];
    }
  });

  try {
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (req.method === 'POST' || req.method === 'PUT') {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        fetchOptions.body = req;
        fetchOptions.duplex = 'half';
      } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
        fetchOptions.headers['content-type'] = 'application/json';
      } else {
        fetchOptions.body = req.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error(`[Proxy Error to ${targetUrl}]`, err);
    res.status(502).json({ error: `Bad Gateway: ${err.message}` });
  }
}

// Models Service Proxy (port 8000)
router.all(/^\/models/, (req, res) => {
  const modelsUrl = process.env.MODELS_URL || 'http://127.0.0.1:8000';
  return streamProxy(modelsUrl, req, res);
});

// Chatbot Service Proxy (port 8001)
router.all(/^\/chatbot/, (req, res) => {
  const chatbotUrl = process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://127.0.0.1:8001';
  return streamProxy(chatbotUrl, req, res);
});

// ==========================================
// 2. REGISTER
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'All fields (email, password, fullName, role) are required.' });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ message: 'Full name must be between 2 and 100 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    if (role !== 'PATIENT' && role !== 'DOCTOR') {
      return res.status(400).json({ message: 'Invalid role. Role must be PATIENT or DOCTOR.' });
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, trimmedEmail));

    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        email: trimmedEmail,
        passwordHash,
        fullName: trimmedName,
        role,
        onboardingComplete: false,
      })
      .returning();

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: error.message || 'An error occurred during registration.' });
  }
});

// ==========================================
// 3. GET DOCTORS
// ==========================================
router.get('/doctors', async (req, res) => {
  try {
    const doctorsList = await db
      .select({
        profileId: doctorProfiles.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
        specialization: doctorProfiles.specialization,
        hospitalAffiliation: doctorProfiles.hospitalAffiliation,
        yearsExperience: doctorProfiles.yearsExperience,
        bio: doctorProfiles.bio,
      })
      .from(doctorProfiles)
      .innerJoin(users, eq(doctorProfiles.userId, users.id));

    return res.json(doctorsList);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while fetching doctors.' });
  }
});

// ==========================================
// 4. ONBOARDING
// ==========================================
router.post('/onboarding', authenticateProxyUser, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      dob,
      gender,
      bloodGroup,
      heightCm,
      weightKg,
      emergencyContact,
      selectedDoctorId,
      defaultIcon,
      licenseNumber,
      specialization,
      yearsExperience: yearsExperienceStr,
      bio,
      hospitalAffiliation,
    } = req.body;

    let profileImageUrl = defaultIcon || '/avatars/avatar1.png';

    if (req.file) {
      profileImageUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype || 'image/jpeg',
        'profile-images'
      );
    }

    const [userRecord] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));

    const role = userRecord?.role || req.user.role;

    // Validation
    if (fullName && (fullName.trim().length < 2 || fullName.trim().length > 100)) {
      return res.status(400).json({ message: 'Full name must be between 2 and 100 characters.' });
    }

    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const birthZero = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

      if (isNaN(birthDate.getTime()) || birthZero > todayZero) {
        return res.status(400).json({ message: 'Date of birth cannot be in the future (negative age).' });
      }

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

      if (age < 0 || age > 130) {
        return res.status(400).json({ message: 'Age must be between 0 and 130 years.' });
      }
    }

    if (heightCm) {
      const h = parseFloat(heightCm);
      if (isNaN(h) || h <= 0 || h < 30 || h > 300) {
        return res.status(400).json({ message: 'Height must be a positive number between 30 cm and 300 cm.' });
      }
    }

    if (weightKg) {
      const w = parseFloat(weightKg);
      if (isNaN(w) || w <= 0 || w < 1 || w > 500) {
        return res.status(400).json({ message: 'Weight must be a positive number between 1 kg and 500 kg.' });
      }
    }

    if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender selection.' });
    }

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (bloodGroup && !validBloodGroups.includes(bloodGroup)) {
      return res.status(400).json({ message: 'Invalid blood group selection.' });
    }

    if (emergencyContact && emergencyContact.trim()) {
      const phoneRegex = /^(\+?[0-9\s\-()]{7,20})$/;
      if (!phoneRegex.test(emergencyContact.trim())) {
        return res.status(400).json({ message: 'Emergency contact must be a valid phone number (at least 7 digits).' });
      }
    }

    if (role === 'PATIENT') {
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            fullName: fullName || undefined,
            dateOfBirth: dob || null,
            gender: gender || null,
            bloodGroup: bloodGroup || null,
            heightCm: heightCm ? heightCm : null,
            weightKg: weightKg ? weightKg : null,
            emergencyContactPhone: emergencyContact || null,
            profileImageUrl,
            onboardingComplete: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        if (selectedDoctorId && selectedDoctorId !== 'undefined' && selectedDoctorId !== 'null' && selectedDoctorId !== '') {
          const existingConnection = await tx
            .select()
            .from(doctorPatients)
            .where(and(eq(doctorPatients.doctorId, selectedDoctorId), eq(doctorPatients.patientId, userId)));

          if (existingConnection.length === 0) {
            await tx.insert(doctorPatients).values({
              doctorId: selectedDoctorId,
              patientId: userId,
              status: 'ACTIVE',
              isActive: true,
            });
          } else {
            await tx
              .update(doctorPatients)
              .set({ isActive: true, status: 'ACTIVE' })
              .where(and(eq(doctorPatients.doctorId, selectedDoctorId), eq(doctorPatients.patientId, userId)));
          }
        }
      });
    } else if (role === 'DOCTOR') {
      if (!licenseNumber) {
        return res.status(400).json({ message: 'License number is required for doctor profile.' });
      }

      const yearsExperience = yearsExperienceStr ? parseInt(yearsExperienceStr, 10) : null;

      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            fullName: fullName || undefined,
            dateOfBirth: dob || null,
            gender: gender || null,
            bloodGroup: bloodGroup || null,
            heightCm: heightCm ? heightCm : null,
            weightKg: weightKg ? weightKg : null,
            emergencyContactPhone: emergencyContact || null,
            profileImageUrl,
            onboardingComplete: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        const [existingProfile] = await tx
          .select()
          .from(doctorProfiles)
          .where(eq(doctorProfiles.userId, userId));

        if (existingProfile) {
          await tx
            .update(doctorProfiles)
            .set({
              licenseNumber,
              specialization: specialization || null,
              yearsExperience,
              bio: bio || null,
              hospitalAffiliation: hospitalAffiliation || null,
              isVerified: true,
            })
            .where(eq(doctorProfiles.userId, userId));
        } else {
          await tx.insert(doctorProfiles).values({
            userId,
            licenseNumber,
            specialization: specialization || null,
            yearsExperience,
            bio: bio || null,
            hospitalAffiliation: hospitalAffiliation || null,
            isVerified: true,
          });
        }
      });
    }

    return res.json({
      message: 'Onboarding completed successfully.',
      user: {
        id: userId,
        role,
        onboardingComplete: true,
        profileImageUrl,
      },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({ message: error.message || 'An error occurred during onboarding.' });
  }
});

// ==========================================
// 5. GET DOCTOR PATIENTS
// ==========================================
router.get('/doctor/patients', authenticateProxyUser, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Access denied. Doctors only.' });
    }

    const userId = req.user.id;

    const [doctor] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId));

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    const allPatients = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        bloodGroup: users.bloodGroup,
        heightCm: users.heightCm,
        weightKg: users.weightKg,
        allergiesJson: users.allergiesJson,
        chronicConditionsJson: users.chronicConditionsJson,
        currentMedicationsJson: users.currentMedicationsJson,
        emergencyContactPhone: users.emergencyContactPhone,
        profileImageUrl: users.profileImageUrl,
        assignedDoctorId: doctorPatients.doctorId,
        assignedAt: doctorPatients.assignedAt,
        assignmentStatus: doctorPatients.status,
        isActive: doctorPatients.isActive,
      })
      .from(users)
      .leftJoin(doctorPatients, and(eq(users.id, doctorPatients.patientId), eq(doctorPatients.isActive, true)))
      .where(eq(users.role, 'PATIENT'));

    // Deduplicate patients: prioritize assignments for this doctor
    const uniquePatientsMap = new Map();
    for (const patient of allPatients) {
      const existing = uniquePatientsMap.get(patient.id);
      if (!existing) {
        uniquePatientsMap.set(patient.id, patient);
      } else {
        if (patient.assignedDoctorId === doctor.id) {
          uniquePatientsMap.set(patient.id, patient);
        }
      }
    }
    const uniquePatients = Array.from(uniquePatientsMap.values());

    const patientDetails = await Promise.all(
      uniquePatients.map(async (patient) => {
        const scans = await db
          .select()
          .from(diseaseScans)
          .where(eq(diseaseScans.patientId, patient.id));

        const metrics = await db
          .select()
          .from(healthMetrics)
          .where(eq(healthMetrics.patientId, patient.id));

        const reports = await db
          .select()
          .from(medicalReports)
          .where(eq(medicalReports.patientId, patient.id));

        return {
          ...patient,
          scans,
          metrics,
          reports,
        };
      })
    );

    return res.json({
      doctorProfileId: doctor.id,
      patients: patientDetails,
    });
  } catch (error) {
    console.error('Error fetching doctor patients:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while fetching patients.' });
  }
});

// ==========================================
// 5.1 DOCTOR UPDATE PATIENT PROFILE
// ==========================================
router.post('/doctor/update-patient-profile', authenticateProxyUser, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Access denied. Doctors only.' });
    }
    const {
      patientId,
      fullName,
      dob,
      gender,
      bloodGroup,
      heightCm,
      weightKg,
      allergiesJson,
      chronicConditionsJson,
      currentMedicationsJson,
      emergencyContactPhone,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    if (fullName && (fullName.trim().length < 2 || fullName.trim().length > 100)) {
      return res.status(400).json({ message: 'Full name must be between 2 and 100 characters.' });
    }

    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const birthZero = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

      if (isNaN(birthDate.getTime()) || birthZero > todayZero) {
        return res.status(400).json({ message: 'Date of birth cannot be in the future (negative age).' });
      }

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

      if (age < 0 || age > 130) {
        return res.status(400).json({ message: 'Age must be between 0 and 130 years.' });
      }
    }

    if (heightCm) {
      const h = parseFloat(heightCm);
      if (isNaN(h) || h <= 0 || h < 30 || h > 300) {
        return res.status(400).json({ message: 'Height must be a positive number between 30 cm and 300 cm.' });
      }
    }

    if (weightKg) {
      const w = parseFloat(weightKg);
      if (isNaN(w) || w <= 0 || w < 1 || w > 500) {
        return res.status(400).json({ message: 'Weight must be a positive number between 1 kg and 500 kg.' });
      }
    }

    await db
      .update(users)
      .set({
        fullName: fullName || undefined,
        dateOfBirth: dob || null,
        gender: gender || null,
        bloodGroup: bloodGroup || null,
        heightCm: heightCm || null,
        weightKg: weightKg || null,
        allergiesJson: allergiesJson || null,
        chronicConditionsJson: chronicConditionsJson || null,
        currentMedicationsJson: currentMedicationsJson || null,
        emergencyContactPhone: emergencyContactPhone || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, patientId));

    return res.json({ message: 'Patient profile updated successfully.' });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while updating patient profile.' });
  }
});

// ==========================================
// 5.2 DOCTOR ADD PATIENT METRIC
// ==========================================
router.post('/doctor/add-patient-metric', authenticateProxyUser, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Access denied. Doctors only.' });
    }
    const {
      patientId,
      steps,
      heartRateAvg,
      spo2Percentage,
      sleepDurationMinutes,
      metricDate,
    } = req.body;

    if (!patientId || !metricDate) {
      return res.status(400).json({ message: 'Patient ID and Metric Date are required.' });
    }

    const existing = await db
      .select({ id: healthMetrics.id })
      .from(healthMetrics)
      .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, metricDate)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(healthMetrics)
        .set({
          steps: steps !== undefined ? parseInt(steps, 10) : undefined,
          heartRateAvg: heartRateAvg !== undefined ? parseInt(heartRateAvg, 10) : undefined,
          spo2Percentage: spo2Percentage !== undefined ? parseFloat(spo2Percentage).toFixed(2) : undefined,
          sleepDurationMinutes: sleepDurationMinutes !== undefined ? parseInt(sleepDurationMinutes, 10) : undefined,
          source: 'MANUAL',
          syncedAt: new Date(),
        })
        .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, metricDate)));
    } else {
      await db.insert(healthMetrics).values({
        patientId,
        steps: steps !== undefined ? parseInt(steps, 10) : null,
        heartRateAvg: heartRateAvg !== undefined ? parseInt(heartRateAvg, 10) : null,
        spo2Percentage: spo2Percentage !== undefined ? parseFloat(spo2Percentage).toFixed(2) : null,
        sleepDurationMinutes: sleepDurationMinutes !== undefined ? parseInt(sleepDurationMinutes, 10) : null,
        metricDate,
        source: 'MANUAL',
      });
    }

    return res.json({ message: 'Patient metric logged successfully.' });
  } catch (error) {
    console.error('Error logging patient metric:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while logging health metrics.' });
  }
});

// ==========================================
// 8. GET HEALTH METRICS FOR PATIENT
// ==========================================
router.get('/health/metrics', authenticateProxyUser, async (req, res) => {
  try {
    const patientId = req.user.id;
    const metrics = await db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.patientId, patientId))
      .orderBy(desc(healthMetrics.metricDate));
    return res.json(metrics);
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while fetching health metrics.' });
  }
});

// ==========================================
// 9. POST HEALTH METRICS (patient can add/update own metrics)
// ==========================================
router.post('/health/metrics', authenticateProxyUser, async (req, res) => {
  try {
    const {
      patientId: bodyPatientId,
      steps,
      heartRateAvg,
      heartRateMin,
      heartRateMax,
      spo2Percentage,
      sleepDurationMinutes,
      caloriesBurnt,
      distanceMeters,
      metricDate,
      source,
    } = req.body;
    const patientId = bodyPatientId || req.user.id;
    if (!patientId || !metricDate) {
      return res.status(400).json({ message: 'Patient ID and Metric Date are required.' });
    }
    const existing = await db
      .select({ id: healthMetrics.id })
      .from(healthMetrics)
      .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, metricDate)))
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(healthMetrics)
        .set({
          steps: steps !== undefined ? parseInt(steps, 10) : undefined,
          heartRateAvg: heartRateAvg !== undefined ? parseInt(heartRateAvg, 10) : undefined,
          heartRateMin: heartRateMin !== undefined ? parseInt(heartRateMin, 10) : undefined,
          heartRateMax: heartRateMax !== undefined ? parseInt(heartRateMax, 10) : undefined,
          spo2Percentage: spo2Percentage !== undefined ? parseFloat(spo2Percentage).toFixed(2) : undefined,
          sleepDurationMinutes: sleepDurationMinutes !== undefined ? parseInt(sleepDurationMinutes, 10) : undefined,
          caloriesBurnt: caloriesBurnt !== undefined ? parseFloat(caloriesBurnt) : undefined,
          distanceMeters: distanceMeters !== undefined ? parseFloat(distanceMeters) : undefined,
          source: source || 'MANUAL',
          syncedAt: new Date(),
        })
        .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, metricDate)));
    } else {
      await db.insert(healthMetrics).values({
        patientId,
        steps: steps !== undefined ? parseInt(steps, 10) : null,
        heartRateAvg: heartRateAvg !== undefined ? parseInt(heartRateAvg, 10) : null,
        heartRateMin: heartRateMin !== undefined ? parseInt(heartRateMin, 10) : null,
        heartRateMax: heartRateMax !== undefined ? parseInt(heartRateMax, 10) : null,
        spo2Percentage: spo2Percentage !== undefined ? parseFloat(spo2Percentage).toFixed(2) : null,
        sleepDurationMinutes: sleepDurationMinutes !== undefined ? parseInt(sleepDurationMinutes, 10) : null,
        caloriesBurnt: caloriesBurnt !== undefined ? parseFloat(caloriesBurnt) : null,
        distanceMeters: distanceMeters !== undefined ? parseFloat(distanceMeters) : null,
        metricDate,
        source: source || 'MANUAL',
      });
    }
    return res.json({ message: 'Health metric saved successfully.' });
  } catch (error) {
    console.error('Error saving health metric:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while saving health metrics.' });
  }
});

// ==========================================
// 6. DOCTOR ASSIGN
// ==========================================
router.post('/doctor/assign', authenticateProxyUser, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user.id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const existingConnection = await db
      .select()
      .from(doctorPatients)
      .where(eq(doctorPatients.patientId, patientId));

    await db.transaction(async (tx) => {
      if (existingConnection.length > 0) {
        await tx
          .delete(doctorPatients)
          .where(eq(doctorPatients.patientId, patientId));
      }

      await tx.insert(doctorPatients).values({
        doctorId,
        patientId,
        status: 'ACTIVE',
      });
    });

    return res.json({ message: 'Doctor assigned successfully.' });
  } catch (error) {
    console.error('Error assigning doctor:', error);
    return res.status(500).json({ message: error.message || 'An error occurred during doctor assignment.' });
  }
});

// ==========================================
// 6a. PATIENT DOCTOR MANAGEMENT
// ==========================================
router.get('/patient/doctors', authenticateProxyUser, async (req, res) => {
  try {
    const patientId = req.user.id;
    
    // Fetch all doctor profiles
    const doctorsList = await db
      .select({
        profileId: doctorProfiles.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
        specialization: doctorProfiles.specialization,
        hospitalAffiliation: doctorProfiles.hospitalAffiliation,
        yearsExperience: doctorProfiles.yearsExperience,
        bio: doctorProfiles.bio,
      })
      .from(doctorProfiles)
      .innerJoin(users, eq(doctorProfiles.userId, users.id));

    // Fetch this patient's doctor connections
    const connections = await db
      .select()
      .from(doctorPatients)
      .where(eq(doctorPatients.patientId, patientId));

    const connectionMap = {};
    connections.forEach((conn) => {
      connectionMap[conn.doctorId] = {
        isActive: conn.isActive,
        status: conn.status,
      };
    });

    const result = doctorsList.map((doc) => ({
      ...doc,
      isAssociated: !!connectionMap[doc.profileId],
      isActive: connectionMap[doc.profileId] ? connectionMap[doc.profileId].isActive : false,
    }));

    return res.json(result);
  } catch (error) {
    console.error('Error fetching patient doctors:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while retrieving doctors.' });
  }
});

router.post('/patient/doctors/add', authenticateProxyUser, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user.id;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const existing = await db
      .select()
      .from(doctorPatients)
      .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)));

    if (existing.length === 0) {
      await db.insert(doctorPatients).values({
        doctorId,
        patientId,
        status: 'ACTIVE',
        isActive: true,
      });
    } else {
      await db
        .update(doctorPatients)
        .set({ isActive: true, status: 'ACTIVE' })
        .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)));
    }

    return res.json({ message: 'Doctor added successfully.' });
  } catch (error) {
    console.error('Error adding doctor:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while adding doctor.' });
  }
});

router.post('/patient/doctors/toggle-active', authenticateProxyUser, async (req, res) => {
  try {
    const { doctorId, isActive } = req.body;
    const patientId = req.user.id;

    if (!doctorId || isActive === undefined) {
      return res.status(400).json({ message: 'Doctor ID and isActive are required.' });
    }

    await db
      .update(doctorPatients)
      .set({ isActive: !!isActive })
      .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)));

    return res.json({ message: `Doctor active status successfully set to ${isActive}.` });
  } catch (error) {
    console.error('Error toggling doctor active status:', error);
    return res.status(500).json({ message: error.message || 'An error occurred while updating status.' });
  }
});

// ==========================================
// 7. POST SCAN
// ==========================================
router.post('/scans', authenticateProxyUser, upload.single('file'), async (req, res) => {
  try {
    let patientId = req.user.id;
    if (req.user.role === 'DOCTOR') {
      patientId = req.body.patientId || req.query.patientId || req.user.id;
    }
    const { scanType, predictionResult: predictionResultStr, modelInputMetadata: modelInputMetadataStr } = req.body;

    if (!scanType || !predictionResultStr) {
      return res.status(400).json({ message: 'Missing required fields scanType or predictionResult' });
    }

    const predictionResult = JSON.parse(predictionResultStr);
    const modelInputMetadata = modelInputMetadataStr ? JSON.parse(modelInputMetadataStr) : null;

    let inputImageUrl = null;
    let r2Key = null;

    if (req.file) {
      const publicUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype || 'image/png',
        'disease-scans'
      );
      inputImageUrl = publicUrl;

      const baseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
      if (publicUrl.startsWith(baseUrl)) {
        r2Key = publicUrl.substring(baseUrl.length + 1);
      }
    }

    const [insertedScan] = await db
      .insert(diseaseScans)
      .values({
        patientId,
        scanType,
        inputImageUrl,
        r2Key,
        modelInputMetadata,
        predictionResult,
        status: 'PENDING',
      })
      .returning();

    let aiExplanation = `Successfully completed ${scanType.replace('_', ' ')} analysis.`;
    let aiSuggestions = [];
    let medicines = [];
    let affectedParts = [];

    const apiKey = process.env.OPENCODE_ZEN_KEY;
    const model = process.env.OPENCODE_ZEN_MODEL || 'deepseek-v4-flash-free';

    if (apiKey) {
      try {
        const prompt = `
          You are an advanced medical assistant AI.
          Analyze the following medical diagnostic scan and its prediction result:
          
          Scan Type: ${scanType}
          Model Inputs / Patient Metadata: ${JSON.stringify(modelInputMetadata, null, 2)}
          Prediction Result / Model Output: ${JSON.stringify(predictionResult, null, 2)}
          
          Generate:
          1. A detailed medical explanation of the results (ai_explanation). Keep it clear and professional.
          2. Actionable recommendations or suggestions for the patient (ai_suggestions).
          3. Common medications or treatments associated with this diagnosis (medicines).
          4. Affected body parts or anatomical systems involved (affected_parts) from the following list of 13 predefined human body parts:
             1: Skeleton Structure
             2: Circulatory System
             3: Urinary System
             4: Digestive System
             5: Gallbladder
             6: Liver
             7: Diaphragm
             8: Heart
             9: Lungs
             10: Brain
             11: Eyes
             12: Muscular System
             13: Full Body (Skin)
          
          You MUST respond ONLY with a raw JSON object. Do not include markdown code block formatting (like \`\`\`json).
          
          JSON Format:
          {
            "ai_explanation": "Detailed explanation here...",
            "ai_suggestions": ["Suggestion 1", "Suggestion 2", ...],
            "medicines": ["Medicine 1", "Medicine 2", ...],
            "affected_parts": [integer1, integer2, ...]
          }
        `;

        const response = await fetch('https://opencode.ai/zen/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are a professional medical assistant AI. Respond only in raw JSON matching the requested schema.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const completion = await response.json();
          let content = completion.choices?.[0]?.message?.content || '';
          content = content.replace(/```json/g, '').replace(/```/g, '').trim();

          const parsed = JSON.parse(content);
          if (parsed.ai_explanation) aiExplanation = parsed.ai_explanation;
          if (Array.isArray(parsed.ai_suggestions)) aiSuggestions = parsed.ai_suggestions;
          if (Array.isArray(parsed.medicines)) medicines = parsed.medicines;
          if (Array.isArray(parsed.affected_parts)) {
            affectedParts = parsed.affected_parts
              .map(x => parseInt(x, 10))
              .filter(x => !isNaN(x) && x >= 1 && x <= 13);
          }
        }
      } catch (err) {
        console.error('Failed to fetch suggestions from OpenCode Zen API:', err);
      }
    }

    if (aiSuggestions.length === 0) {
      aiSuggestions = ['Consult a healthcare professional for a detailed evaluation.', 'Monitor your condition and schedule regular checkups.'];
    }
    if (affectedParts.length === 0) {
      if (scanType === 'BONE_FRACTURE') affectedParts = [1];
      else if (scanType === 'BRAIN_TUMOR') affectedParts = [10];
      else if (scanType === 'ECG' || scanType === 'HEART') affectedParts = [8];
      else if (scanType === 'SKIN') affectedParts = [13];
      else if (scanType === 'CHEST') affectedParts = [9];
      else affectedParts = [13];
    }
    if (medicines.length === 0) {
      if (scanType === 'BONE_FRACTURE' && predictionResult.diagnosis === 'fractured') {
        medicines = ['Pain relievers (e.g., Acetaminophen, Ibuprofen)', 'Calcium & Vitamin D supplements'];
      } else if (scanType === 'BRAIN_TUMOR' && predictionResult.tumor_found) {
        medicines = ['Corticosteroids (to reduce swelling)', 'Anticonvulsants (if seizures occur)'];
      } else if (scanType === 'ECG' && predictionResult.diagnosis !== 'Normal Sinus Rhythm') {
        medicines = ['Beta-blockers', 'Antiarrhythmic drugs'];
      } else if (scanType === 'HEART' && predictionResult.risk_prediction === 1) {
        medicines = ['Aspirin', 'Beta-blockers or Statins'];
      } else if (scanType === 'SKIN' && predictionResult.diagnosis !== 'Benign_tumors') {
        medicines = ['Topical corticosteroids', 'Antifungals or Antibiotics (if infected)'];
      } else {
        medicines = ['None currently recommended. Refer to your physician.'];
      }
    }

    const [updatedScan] = await db
      .update(diseaseScans)
      .set({
        aiExplanation,
        aiSuggestions,
        medicines,
        affectedParts,
        status: 'COMPLETED',
        completedAt: new Date(),
      })
      .where(eq(diseaseScans.id, insertedScan.id))
      .returning();

    return res.json(updatedScan);
  } catch (error) {
    console.error('Error creating disease scan:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ==========================================
// 8. POST MEDICAL REPORT
// ==========================================
router.post('/medical-reports', authenticateProxyUser, upload.single('file'), async (req, res) => {
  try {
    let patientId = req.user.id;
    if (req.user.role === 'DOCTOR') {
      patientId = req.body.patientId || req.query.patientId || req.user.id;
    }
    const { title, description, reportType, reportDate, selectedPartId, selectedPartName, selectedPartStage, fromVisualizeBody } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    let fileUrl = null;
    let r2Key = null;
    let fileType = null;
    let aiSummary = null;
    let medicines = null;
    let affectedParts = [];

    if (selectedPartStage) {
      const stageInt = parseInt(selectedPartStage, 10);
      if (!isNaN(stageInt) && stageInt >= 1 && stageInt <= 13) {
        affectedParts.push(stageInt);
      }
    }

    if (req.file) {
      fileType = req.file.mimetype || 'application/octet-stream';
      const publicUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        fileType,
        'medical-reports'
      );
      fileUrl = publicUrl;

      const baseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
      if (publicUrl.startsWith(baseUrl)) {
        r2Key = publicUrl.substring(baseUrl.length + 1);
      }
    }

    const apiKey = process.env.OPENCODE_ZEN_KEY;
    const model = process.env.OPENCODE_ZEN_MODEL || 'deepseek-v4-flash-free';

    // Generate ai_summary, medicines, and affected_parts via OpenCode Zen API
    if (apiKey) {
      try {
        let primaryPartInfo = "";
        if (selectedPartStage && selectedPartName) {
          primaryPartInfo = `The user clicked/selected the body part: "${selectedPartName}" (stage number: ${selectedPartStage}) in their anatomical visualization.`;
        }

        let fileInfo = "";
        if (req.file) {
          fileInfo = `The user also attached a file named "${req.file.originalname}" (type: ${req.file.mimetype}).`;
        }

        const prompt = `You are a clinical AI assistant.
A patient has logged a new medical report/symptom with the following details:
- Title: "${title}"
- Description: "${description || 'No description provided'}"
${primaryPartInfo}
${fileInfo}

You need to analyze this medical report and generate three pieces of information:
1. A concise, professional clinical summary (2-4 sentences) of what this report likely contains, the symptoms, and any key observations.
2. A list of relevant or recommended medicines/treatments that are commonly associated with this problem or could help relieve the symptoms (provide a clean list of 1 to 4 medicine names or general treatments).
3. Identify all affected parts from the following predefined list of 13 body parts.
   Predefined List of 13 parts:
   1: Skeleton Structure
   2: Circulatory System
   3: Urinary System
   4: Digestive System
   5: Gallbladder
   6: Liver
   7: Diaphragm
   8: Heart
   9: Lungs
   10: Brain
   11: Eyes
   12: Muscular System
   13: Full Body (Skin)

   Instructions for affected parts:
   - If the user selected/clicked a specific body part (e.g. stage ${selectedPartStage || 'none'}), that stage number MUST be included in the affected parts list.
   - If the reported problem or symptoms affect any other parts/systems from the list of 13 parts, identify them and include their stage numbers (integers 1-13) as well.
   - Return only the integers (1-13) representing the affected parts.

You MUST respond with a JSON object containing exactly these keys:
{
  "ai_summary": "string containing the clinical summary",
  "medicines": ["medicine 1", "medicine 2", ...],
  "affected_parts": [integer1, integer2, ...]
}

Return ONLY the raw JSON object. Do not include markdown code block formatting (like \`\`\`json), just the plain JSON string.`;

        const response = await fetch('https://opencode.ai/zen/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are a clinical AI assistant. You output raw JSON only.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content?.trim() || "";
          if (content.startsWith("```")) {
            content = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
          }
          try {
            const parsed = JSON.parse(content);
            if (parsed.ai_summary) aiSummary = parsed.ai_summary;
            if (Array.isArray(parsed.medicines)) medicines = parsed.medicines;
            if (Array.isArray(parsed.affected_parts)) {
              const extraParts = parsed.affected_parts
                .map(x => parseInt(x, 10))
                .filter(x => !isNaN(x) && x >= 1 && x <= 13);
              const merged = new Set([...affectedParts, ...extraParts]);
              affectedParts = Array.from(merged);
            }
          } catch (e) {
            console.error('Failed to parse AI JSON response:', e, content);
          }
        }
      } catch (e) {
        console.error('AI generation failed:', e);
      }
    }

    // Fallback to standard summary for general image upload if aiSummary not set
    if (!aiSummary && req.file && fileType && fileType.startsWith('image/') && apiKey) {
      try {
        const prompt = `You are a medical AI assistant. A patient uploaded a medical image file named "${req.file.originalname}" with the title "${title}"${description ? ` and description: "${description}"` : ''}. Generate a concise, professional clinical summary (2-4 sentences) of what this report likely contains and any key observations. Respond with plain text only.`;
        const response = await fetch('https://opencode.ai/zen/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are a clinical AI assistant. Be concise and professional.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const summary = data.choices?.[0]?.message?.content?.trim();
          if (summary) aiSummary = summary;
        }
      } catch (e) {
        console.error('AI summary generation failed:', e);
      }
    }

    if (affectedParts.length === 0 && selectedPartStage) {
      const stageInt = parseInt(selectedPartStage, 10);
      if (!isNaN(stageInt) && stageInt >= 1 && stageInt <= 13) {
        affectedParts.push(stageInt);
      }
    }

    const [created] = await db
      .insert(medicalReports)
      .values({
        patientId,
        title,
        description: aiSummary || null,
        reportType: reportType || null,
        fileUrl,
        r2Key,
        fileType,
        aiSummary: aiSummary ? { summary: aiSummary } : null,
        medicines: medicines || null,
        affectedParts: affectedParts.length > 0 ? affectedParts : null,
        reportDate: reportDate || null,
      })
      .returning();

    return res.json(created);
  } catch (error) {
    console.error('Error creating medical report:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ==========================================
// 8.5 GET USER PROFILE
// ==========================================
router.get('/user/profile', authenticateProxyUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        bloodGroup: users.bloodGroup,
        heightCm: users.heightCm,
        weightKg: users.weightKg,
        allergiesJson: users.allergiesJson,
        chronicConditionsJson: users.chronicConditionsJson,
        currentMedicationsJson: users.currentMedicationsJson,
        emergencyContactPhone: users.emergencyContactPhone,
        role: users.role,
        onboardingComplete: users.onboardingComplete,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ==========================================
// 8.6 GET HEALTH METRICS
// ==========================================
router.get('/health/metrics', authenticateProxyUser, async (req, res) => {
  try {
    let patientId = req.user.id;
    if (req.user.role === 'DOCTOR' && req.query.patientId) {
      patientId = req.query.patientId;
    }
    const metrics = await db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.patientId, patientId))
      .orderBy(desc(healthMetrics.metricDate))
      .limit(30);

    return res.json(metrics);
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ==========================================
// 8.7 POST / UPSERT HEALTH METRICS
// ==========================================
router.post('/health/metrics', authenticateProxyUser, async (req, res) => {
  try {
    let patientId = req.user.id;
    if (req.user.role === 'DOCTOR' && req.body.patientId) {
      patientId = req.body.patientId;
    }

    const {
      steps,
      heartRateAvg,
      heartRateMin,
      heartRateMax,
      caloriesBurnt,
      distanceMeters,
      spo2Percentage,
      sleepDurationMinutes,
      metricDate,
      source,
    } = req.body;

    const dateToUse = metricDate || new Date().toISOString().slice(0, 10);

    const existing = await db
      .select({ id: healthMetrics.id })
      .from(healthMetrics)
      .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, dateToUse)))
      .limit(1);

    const metricPayload = {
      patientId,
      steps: steps !== undefined && steps !== null && steps !== '' ? parseInt(steps, 10) : null,
      heartRateAvg: heartRateAvg !== undefined && heartRateAvg !== null && heartRateAvg !== '' ? parseInt(heartRateAvg, 10) : null,
      heartRateMin: heartRateMin !== undefined && heartRateMin !== null && heartRateMin !== '' ? parseInt(heartRateMin, 10) : null,
      heartRateMax: heartRateMax !== undefined && heartRateMax !== null && heartRateMax !== '' ? parseInt(heartRateMax, 10) : null,
      caloriesBurnt: caloriesBurnt !== undefined && caloriesBurnt !== null && caloriesBurnt !== '' ? parseFloat(caloriesBurnt).toFixed(2) : null,
      distanceMeters: distanceMeters !== undefined && distanceMeters !== null && distanceMeters !== '' ? parseFloat(distanceMeters).toFixed(2) : null,
      spo2Percentage: spo2Percentage !== undefined && spo2Percentage !== null && spo2Percentage !== '' ? parseFloat(spo2Percentage).toFixed(2) : null,
      sleepDurationMinutes: sleepDurationMinutes !== undefined && sleepDurationMinutes !== null && sleepDurationMinutes !== '' ? parseInt(sleepDurationMinutes, 10) : null,
      source: source || 'MANUAL',
      syncedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(healthMetrics)
        .set(metricPayload)
        .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, dateToUse)));
    } else {
      await db.insert(healthMetrics).values({
        ...metricPayload,
        metricDate: dateToUse,
      });
    }

    return res.json({ message: 'Health metrics saved successfully.' });
  } catch (error) {
    console.error('Error saving health metrics:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});


// ==========================================
// 9. GET MEDICAL HISTORY
// ==========================================
router.get('/medical-history', authenticateProxyUser, async (req, res) => {
  try {
    let patientId = req.user.id;
    if (req.user.role === 'DOCTOR' && req.query.patientId) {
      patientId = req.query.patientId;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!patientId || typeof patientId !== 'string' || !uuidRegex.test(patientId)) {
      return res.json({ scans: [], reports: [] });
    }

    const scans = await db
      .select()
      .from(diseaseScans)
      .where(eq(diseaseScans.patientId, patientId))
      .orderBy(desc(diseaseScans.createdAt));

    const reports = await db
      .select()
      .from(medicalReports)
      .where(eq(medicalReports.patientId, patientId))
      .orderBy(desc(medicalReports.uploadedAt));

    return res.json({ scans, reports });
  } catch (error) {
    console.error('Error fetching medical history:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ==========================================
// 10. POST USER PROFILE IMAGE
// ==========================================
router.post('/user/profile-image', authenticateProxyUser, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const publicUrl = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype || 'image/jpeg',
      'profile-images'
    );

    await db
      .update(users)
      .set({
        profileImageUrl: publicUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return res.json({
      success: true,
      message: 'Profile image updated successfully.',
      profileImageUrl: publicUrl,
    });
  } catch (error) {
    console.error('[Profile Image Upload Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to upload profile image.' });
  }
});


// ==========================================
// 12. DOCTOR-PATIENT CHAT ENDPOINTS
// ==========================================


// GET /api/chat/doctor-patient
router.get('/chat/doctor-patient', authenticateProxyUser, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    if (role === 'PATIENT') {
      const { doctorId: queryDoctorId } = req.query;
      let association;
      let doctorId;

      if (queryDoctorId) {
        [association] = await db
          .select()
          .from(doctorPatients)
          .where(
            and(
              eq(doctorPatients.patientId, userId),
              eq(doctorPatients.doctorId, queryDoctorId),
              eq(doctorPatients.isActive, true)
            )
          );
        if (association) {
          doctorId = queryDoctorId;
        }
      } else {
        [association] = await db
          .select()
          .from(doctorPatients)
          .where(
            and(
              eq(doctorPatients.patientId, userId),
              eq(doctorPatients.isActive, true)
            )
          );
        if (association) {
          doctorId = association.doctorId;
        }
      }

      if (!association || !doctorId) {
        return res.status(200).json({
          success: false,
          code: 'NO_DOCTOR_ASSIGNED',
          message: 'No active doctor is currently assigned to you. Please link a doctor first.',
        });
      }

      // Find or initialize chat
      let [chat] = await db
        .select()
        .from(doctorPatientChats)
        .where(
          and(
            eq(doctorPatientChats.doctorId, doctorId),
            eq(doctorPatientChats.patientId, userId)
          )
        );

      if (!chat) {
        const [insertedChat] = await db
          .insert(doctorPatientChats)
          .values({
            doctorId,
            patientId: userId,
            messages: [],
          })
          .returning();
        chat = insertedChat;
      }

      // Fetch doctor user details
      const [doctorProfile] = await db
        .select({
          specialization: doctorProfiles.specialization,
          hospitalAffiliation: doctorProfiles.hospitalAffiliation,
          userId: doctorProfiles.userId,
        })
        .from(doctorProfiles)
        .where(eq(doctorProfiles.id, doctorId));

      let otherUser = {
        id: doctorId,
        name: 'Doctor',
        avatar: null,
        role: 'DOCTOR',
        specialization: doctorProfile?.specialization || 'General Practitioner',
      };

      if (doctorProfile) {
        const [doctorUser] = await db
          .select({
            fullName: users.fullName,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .where(eq(users.id, doctorProfile.userId));

        if (doctorUser) {
          otherUser.name = doctorUser.fullName;
          otherUser.avatar = doctorUser.profileImageUrl;
        }
      }

      return res.json({
        success: true,
        chatId: chat.id,
        messages: chat.messages || [],
        otherUser,
        doctorId,
        patientId: userId,
      });

    } else if (role === 'DOCTOR') {
      const { patientId } = req.query;
      if (!patientId) {
        return res.status(400).json({ message: 'patientId query parameter is required.' });
      }

      // Find the doctor's profile
      const [doctor] = await db
        .select()
        .from(doctorProfiles)
        .where(eq(doctorProfiles.userId, userId));

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found.' });
      }

      const doctorId = doctor.id;

      // Verify the patient is assigned to this doctor and active
      const [association] = await db
        .select()
        .from(doctorPatients)
        .where(
          and(
            eq(doctorPatients.doctorId, doctorId),
            eq(doctorPatients.patientId, patientId),
            eq(doctorPatients.isActive, true)
          )
        );

      if (!association) {
        return res.status(403).json({ message: 'Access denied. This patient is not active in your care team.' });
      }

      // Find or initialize chat
      let [chat] = await db
        .select()
        .from(doctorPatientChats)
        .where(
          and(
            eq(doctorPatientChats.doctorId, doctorId),
            eq(doctorPatientChats.patientId, patientId)
          )
        );

      if (!chat) {
        const [insertedChat] = await db
          .insert(doctorPatientChats)
          .values({
            doctorId,
            patientId,
            messages: [],
          })
          .returning();
        chat = insertedChat;
      }

      // Fetch patient user details
      const [patientUser] = await db
        .select({
          fullName: users.fullName,
          profileImageUrl: users.profileImageUrl,
        })
        .from(users)
        .where(eq(users.id, patientId));

      const otherUser = {
        id: patientId,
        name: patientUser?.fullName || 'Patient',
        avatar: patientUser?.profileImageUrl || null,
        role: 'PATIENT',
      };

      return res.json({
        success: true,
        chatId: chat.id,
        messages: chat.messages || [],
        otherUser,
        doctorId,
        patientId,
      });

    } else {
      return res.status(403).json({ message: 'Invalid role for chat access.' });
    }
  } catch (error) {
    console.error('[Get Chat Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to retrieve chat.' });
  }
});

// POST /api/chat/doctor-patient
router.post('/chat/doctor-patient', authenticateProxyUser, async (req, res) => {
  try {
    const { text, patientId } = req.body;
    const role = req.user.role;
    const userId = req.user.id;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    let doctorId, resolvedPatientId;

    if (role === 'PATIENT') {
      const { doctorId: bodyDoctorId } = req.body;
      let association;

      if (bodyDoctorId) {
        [association] = await db
          .select()
          .from(doctorPatients)
          .where(
            and(
              eq(doctorPatients.patientId, userId),
              eq(doctorPatients.doctorId, bodyDoctorId),
              eq(doctorPatients.isActive, true)
            )
          );
        if (association) {
          doctorId = bodyDoctorId;
        }
      } else {
        [association] = await db
          .select()
          .from(doctorPatients)
          .where(
            and(
              eq(doctorPatients.patientId, userId),
              eq(doctorPatients.isActive, true)
            )
          );
        if (association) {
          doctorId = association.doctorId;
        }
      }

      if (!association || !doctorId) {
        return res.status(404).json({ message: 'No active doctor assigned. Cannot send message.' });
      }

      resolvedPatientId = userId;

    } else if (role === 'DOCTOR') {
      if (!patientId) {
        return res.status(400).json({ message: 'patientId is required for doctors sending messages.' });
      }

      // Find the doctor's profile
      const [doctor] = await db
        .select()
        .from(doctorProfiles)
        .where(eq(doctorProfiles.userId, userId));

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor profile not found.' });
      }

      doctorId = doctor.id;
      resolvedPatientId = patientId;

      // Verify patient association
      const [association] = await db
        .select()
        .from(doctorPatients)
        .where(
          and(
            eq(doctorPatients.doctorId, doctorId),
            eq(doctorPatients.patientId, resolvedPatientId),
            eq(doctorPatients.isActive, true)
          )
        );

      if (!association) {
        return res.status(403).json({ message: 'Access denied. Patient not in your care team.' });
      }
    } else {
      return res.status(403).json({ message: 'Invalid role for sending messages.' });
    }

    // Find or initialize the chat
    let [chat] = await db
      .select()
      .from(doctorPatientChats)
      .where(
        and(
          eq(doctorPatientChats.doctorId, doctorId),
          eq(doctorPatientChats.patientId, resolvedPatientId)
        )
      );

    if (!chat) {
      const [insertedChat] = await db
        .insert(doctorPatientChats)
        .values({
          doctorId,
          patientId: resolvedPatientId,
          messages: [],
        })
        .returning();
      chat = insertedChat;
    }

    // Append the new message
    const newMessage = {
      senderId: userId,
      senderRole: role,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(chat.messages || []), newMessage];

    await db
      .update(doctorPatientChats)
      .set({
        messages: updatedMessages,
        updatedAt: new Date(),
      })
      .where(eq(doctorPatientChats.id, chat.id));

    // Real-time WebSocket broadcast
    broadcastChatMessage(doctorId, resolvedPatientId, newMessage);

    return res.json({
      success: true,
      message: newMessage,
    });

  } catch (error) {
    console.error('[Send Chat Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to send message.' });
  }
});

// ==========================================
// CONVERSATIONS
// ==========================================

router.post('/conversations/record', authenticateProxyUser, upload.single('audio'), async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const { patientId } = req.body;
    if (!patientId || !req.file) {
      return res.status(400).json({ error: 'patientId and audio file are required.' });
    }

    // Get doctor profile
    const [doctor] = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, req.user.id));
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    // 1. Upload audio to R2
    const audioUrl = await uploadToR2(
      req.file.buffer,
      req.file.originalname || 'recording.webm',
      req.file.mimetype || 'audio/webm',
      'conversation-audio'
    );

    // 2. Transcribe with Deepgram
    let transcript = '';
    try {
      const dgRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
        method: 'POST',
        headers: {
          'Authorization': 'Token 2fe17a1b181cea86689add388db030752bed67f6',
          'Content-Type': req.file.mimetype || 'audio/webm',
        },
        body: req.file.buffer,
      });
      if (dgRes.ok) {
        const dgData = await dgRes.json();
        transcript = dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      }
    } catch (dgErr) {
      console.error('Deepgram transcription error:', dgErr);
    }

    // 3. LLM analysis
    let conversationSummary = transcript ? `Consultation transcript: ${transcript.substring(0, 200)}...` : 'No transcript available.';
    let conversationMedication = [];

    if (transcript) {
      try {
        const llmRes = await fetch(process.env.OPENAI_BASE_URL + '/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'openai/gpt-oss-120b',
            messages: [
              { role: 'system', content: 'You are a medical assistant. Respond ONLY with raw JSON, no markdown.' },
              { role: 'user', content: `Analyze this doctor-patient conversation transcript and extract: 1) A concise medical summary 2) A list of medications mentioned.\n\nTranscript:\n${transcript}\n\nRespond ONLY with raw JSON: {"summary": "...", "medications": ["med1", "med2"]}` }
            ],
            temperature: 0.2,
          }),
        });
        if (llmRes.ok) {
          const llmData = await llmRes.json();
          let content = llmData.choices?.[0]?.message?.content || '{}';
          content = content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(content);
          if (parsed.summary) conversationSummary = parsed.summary;
          if (Array.isArray(parsed.medications)) conversationMedication = parsed.medications;
        }
      } catch (llmErr) {
        console.error('LLM analysis error:', llmErr);
      }
    }

    // 4. Insert into conversations table
    const [inserted] = await db.insert(conversations).values({
      patientId,
      doctorId: doctor.id,
      conversationTranscription: transcript || null,
      conversationSummary,
      conversationMedication,
      conversationAudio: audioUrl,
    }).returning();

    return res.json(inserted);
  } catch (error) {
    console.error('Conversation record error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record conversation.' });
  }
});

router.get('/conversations/my', authenticateProxyUser, async (req, res) => {
  try {
    const patientId = req.user.id;
    const convs = await db
      .select({
        conversationId: conversations.conversationId,
        patientId: conversations.patientId,
        doctorId: conversations.doctorId,
        conversationTranscription: conversations.conversationTranscription,
        conversationSummary: conversations.conversationSummary,
        conversationMedication: conversations.conversationMedication,
        conversationAudio: conversations.conversationAudio,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        doctorName: users.fullName,
        doctorEmail: users.email,
        doctorImage: users.profileImageUrl,
        doctorSpecialization: doctorProfiles.specialization,
        hospitalAffiliation: doctorProfiles.hospitalAffiliation,
      })
      .from(conversations)
      .leftJoin(doctorProfiles, eq(conversations.doctorId, doctorProfiles.id))
      .leftJoin(users, eq(doctorProfiles.userId, users.id))
      .where(eq(conversations.patientId, patientId))
      .orderBy(desc(conversations.createdAt));

    return res.json({ conversations: convs });
  } catch (error) {
    console.error('Get patient conversations error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get conversations.' });
  }
});

router.get('/conversations/patient/:patientId', authenticateProxyUser, async (req, res) => {
  try {
    if (req.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Doctors only.' });
    }
    const { patientId } = req.params;
    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.patientId, patientId))
      .orderBy(desc(conversations.createdAt));
    return res.json({ conversations: convs });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get conversations.' });
  }
});

router.get('/conversations/:conversationId', authenticateProxyUser, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const [conv] = await db
      .select({
        conversationId: conversations.conversationId,
        patientId: conversations.patientId,
        doctorId: conversations.doctorId,
        conversationTranscription: conversations.conversationTranscription,
        conversationSummary: conversations.conversationSummary,
        conversationMedication: conversations.conversationMedication,
        conversationAudio: conversations.conversationAudio,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        doctorName: users.fullName,
        doctorEmail: users.email,
        doctorImage: users.profileImageUrl,
        doctorSpecialization: doctorProfiles.specialization,
        hospitalAffiliation: doctorProfiles.hospitalAffiliation,
      })
      .from(conversations)
      .leftJoin(doctorProfiles, eq(conversations.doctorId, doctorProfiles.id))
      .leftJoin(users, eq(doctorProfiles.userId, users.id))
      .where(eq(conversations.conversationId, conversationId));

    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    // Ensure only the doctor or the owner patient can access
    if (req.user.role !== 'DOCTOR' && conv.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json(conv);
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get conversation.' });
  }
});

export default router;
