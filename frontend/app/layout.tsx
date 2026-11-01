import type { Metadata } from "next";
import "./globals.css";
import ClickSpark from "@/components/ClickSpark";
import ExtensionErrorFilter from "@/components/ExtensionErrorFilter";
import ThemeInitializer from "@/components/ThemeInitializer";
import { Providers } from "@/components/providers";


export const metadata: Metadata = {
  title: "Hippo Health — Precision AI & Clinical Healthcare Platform",
  description:
    "AI Medical Chatbot, Doctor-Verified Recommendations, Smartwatch Sync, 3D Anatomy Visualization & Advanced Clinical AI Diagnostics.",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    title: "MyWebSite",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Stealth layer: runs before React hydrates so Next.js never sees
            the `bis_skin_checked` / `bis_register` extension attributes.
            Intentionally hides (not fixes) the hydration mismatch + the
            bottom-left "1 Issue" badge, per user request. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var ATTRS=['bis_skin_checked','bis_register'];function clean(root){try{if(!root)return;if(root.removeAttribute){for(var i=0;i<ATTRS.length;i++){try{if(root.hasAttribute&&root.hasAttribute(ATTRS[i]))root.removeAttribute(ATTRS[i]);}catch(e){}}}if(root.querySelectorAll){var els=root.querySelectorAll('[bis_skin_checked],[bis_register]');for(var j=0;j<els.length;j++){try{els[j].removeAttribute('bis_skin_checked');els[j].removeAttribute('bis_register');}catch(e){}}}}catch(e){}}clean(document.documentElement);try{var mo=new MutationObserver(function(muts){for(var k=0;k<muts.length;k++){var m=muts[k];try{if(m.type==='attributes'&&(m.attributeName==='bis_skin_checked'||m.attributeName==='bis_register')){try{m.target.removeAttribute(m.attributeName);}catch(e){}}else if(m.addedNodes&&m.addedNodes.length){for(var n=0;n<m.addedNodes.length;n++){clean(m.addedNodes[n]);}}}catch(e){}}});mo.observe(document.documentElement,{attributes:true,childList:true,subtree:true,attributeFilter:ATTRS});}catch(e){}function txt(a){try{if(typeof a==='string')return a;if(a&&a.message)return a.message+' '+(a.stack||'');try{return JSON.stringify(a);}catch(e){return String(a);}}catch(e){return '';}}function swallow(args){try{for(var s=0;s<args.length;s++){var t=txt(args[s]);if(!t)continue;if(t.indexOf('bis_skin_checked')!==-1||t.indexOf('bis_register')!==-1)return true;if(t.indexOf('A tree hydrated')!==-1||t.indexOf('hydrated but some attributes')!==-1||t.indexOf('server rendered HTML')!==-1||t.indexOf('Hydration failed')!==-1||t.indexOf('hydration mismatch')!==-1||t.indexOf("didn't match the client")!==-1)return true;} }catch(e){}return false;}try{var oe=console.error;console.error=function(){if(swallow(arguments))return;return oe.apply(this,arguments);};var ow=console.warn;console.warn=function(){if(swallow(arguments))return;return ow.apply(this,arguments);};}catch(e){}try{window.addEventListener('error',function(e){try{var msg=(e.message||'')+' '+((e.error&&e.error.stack)||(e.error&&e.error.message)||'');if(msg.indexOf('bis_skin_checked')!==-1||msg.indexOf('bis_register')!==-1||msg.indexOf('A tree hydrated')!==-1||msg.indexOf('hydrat')!==-1&&msg.indexOf('server rendered HTML')!==-1){e.stopImmediatePropagation();e.preventDefault();}}catch(err){}},true);}catch(e){}try{var css='nextjs-portal{display:none!important}#__next-devtools,[data-nextjs-dev-overlay],[data-next-devtools],#__next-build-watcher{display:none!important}';var st=document.createElement('style');st.setAttribute('data-hide-next-badge','');st.textContent=css;var h=document.head||document.documentElement;if(h.firstChild)h.insertBefore(st,h.firstChild);else h.appendChild(st);}catch(e){}}catch(e){}})();`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/google-sans"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <link rel="manifest" href="/site.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#F6F4EF] text-[#1C1B18] font-sans selection:bg-[#F4E071] selection:text-[#1C1B18]"
        suppressHydrationWarning
      >
        <ThemeInitializer />
        <Providers>
          <ExtensionErrorFilter />
          <ClickSpark
            sparkColor="#10B981"
            sparkSize={10}
            sparkRadius={15}
            sparkCount={8}
            duration={400}
            className="flex-1 flex flex-col min-h-0 w-full"
          >
            {children}
          </ClickSpark>
        </Providers>
      </body>
    </html>
  );
}
