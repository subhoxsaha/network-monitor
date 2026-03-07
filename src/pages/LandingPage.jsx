import React, { useState, useEffect, useCallback } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Globe, MapPin, Activity } from 'lucide-react';
import TailwindNavbar from '../components/TailwindNavbar';
import toast from 'react-hot-toast';

const PARTICLES = Array.from({ length: 25 }, () => ({
  w: Math.random() * 180 + 40,
  h: Math.random() * 180 + 40,
  l: Math.random() * 100,
  t: Math.random() * 100,
  dur: Math.random() * 12 + 14,
  del: Math.random() * 6,
}));

const FEATURES = [
  { icon: Globe,    title: 'IP Intelligence',       desc: 'Multi-API geolocation with ISP and ASN data' },
  { icon: MapPin,   title: 'GPS Tracking',          desc: 'Mark your trail throughout the day on Google Maps' },
  { icon: Activity, title: 'Latency Probing',       desc: 'Real-time latency to global backbone servers' },
  { icon: Shield,   title: 'WebRTC Leak Detection', desc: 'Scan for exposed local IPs and privacy leaks' },
  { icon: Zap,      title: 'HTTP Tester',           desc: 'Postman-style request builder with CORS proxy' },
];

// stage: 'intro' → 'exiting' → 'content'
const INTRO_HOLD   = 3000;   // how long intro stays fully visible
const EXIT_DURATION = 550;   // duration of swipe-out animation (ms)

const LandingPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState('intro');

  useEffect(() => {
    if (user) navigate('/overview', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const t1 = setTimeout(() => setStage('exiting'), INTRO_HOLD);
    const t2 = setTimeout(() => setStage('content'), INTRO_HOLD + EXIT_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleSuccess = useCallback((credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      login({ name: decoded.name, email: decoded.email, picture: decoded.picture, sub: decoded.sub });
      navigate('/overview', { replace: true });
    } catch (err) {
      toast.error('Login failed — please try again');
    }
  }, [login, navigate]);

  const handleError = useCallback(() => {
    toast.error('Google Sign-In failed. Check authorized origins in Google Cloud Console.');
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink relative overflow-hidden">

      {/* ════ INTRO OVERLAY (stages: intro + exiting) ════ */}
      {(stage === 'intro' || stage === 'exiting') && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas"
          style={{
            animation: stage === 'exiting'
              ? `lp-swipe-out ${EXIT_DURATION}ms cubic-bezier(0.4,0,1,1) both`
              : 'none',
            willChange: 'transform, opacity',
          }}
        >
          {/* Background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {PARTICLES.map((p, i) => (
              <div key={i} className="absolute rounded-full" style={{
                width: `${p.w}px`, height: `${p.h}px`,
                left: `${p.l}%`, top: `${p.t}%`,
                background: 'radial-gradient(circle, rgba(10,132,255,0.04) 0%, transparent 70%)',
                animation: `landing-float ${p.dur}s ease-in-out infinite`,
                animationDelay: `${p.del}s`,
              }} />
            ))}
          </div>

          {/* Network viz */}
          <div className="relative flex flex-col items-center justify-center z-10">
            <div className="relative w-56 h-56 flex items-center justify-center">
              {/* Outer scanning ring */}
              <div className="absolute inset-0 rounded-full" style={{
                border: '1.5px solid rgba(10,132,255,0.15)',
                animation: 'scan-ring 3s ease-out 0.2s both',
              }} />

              {/* Pulsing rings */}
              {[0, 1, 2].map((r) => (
                <div key={r} className="absolute rounded-full" style={{
                  width: `${180 - r * 48}px`, height: `${180 - r * 48}px`,
                  border: `2px solid rgba(10,132,255,${0.12 + r * 0.08})`,
                  animation: `ring-expand 2.4s ease-out ${0.3 + r * 0.25}s both`,
                  opacity: 0,
                }} />
              ))}

              {/* Orbiting dots */}
              {[0, 1, 2, 3, 4, 5].map((d) => (
                <div key={d} className="absolute" style={{
                  width: '100%', height: '100%',
                  animation: `orbit ${4 + d * 0.5}s linear ${d * 0.2}s infinite`,
                  opacity: 0, animationFillMode: 'forwards',
                }}>
                  <div style={{
                    width: `${6 + (d % 3) * 2}px`, height: `${6 + (d % 3) * 2}px`,
                    borderRadius: '50%',
                    background: ['#0a84ff','#30d158','#ff9f0a','#ff453a','#5e5ce6','#bf5af2'][d],
                    boxShadow: `0 0 12px ${['#0a84ff','#30d158','#ff9f0a','#ff453a','#5e5ce6','#bf5af2'][d]}80`,
                    position: 'absolute', top: '0', left: '50%',
                    transform: 'translateX(-50%)',
                    animation: `dot-appear 0.6s ease-out ${0.8 + d * 0.15}s both`,
                  }} />
                </div>
              ))}

              {/* Center core */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full" style={{
                  background: 'radial-gradient(circle, rgba(10,132,255,0.25) 0%, transparent 70%)',
                  animation: 'core-pulse 2s ease-in-out infinite',
                }} />
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, #0a84ff, #5e5ce6)',
                  boxShadow: '0 0 30px rgba(10,132,255,0.5), 0 0 60px rgba(94,92,230,0.2)',
                  animation: 'core-appear 1s ease-out 0.1s both',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" />
                    <path d="M5 12.859a10 10 0 0 1 14 0" /><path d="M8.5 16.429a5 5 0 0 1 7 0" />
                  </svg>
                </div>
              </div>

              {/* SVG connection lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224" style={{ animation: 'lines-appear 1.5s ease-out 1.2s both', opacity: 0 }}>
                {[[112,112,40,50],[112,112,184,50],[112,112,30,150],[112,112,194,150],[112,112,112,20],[112,112,112,204]].map(([x1,y1,x2,y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(10,132,255,0.12)" strokeWidth="1" strokeDasharray="4 4">
                    <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" begin={`${1.2+i*0.1}s`} fill="freeze" />
                  </line>
                ))}
              </svg>

              {/* Endpoint nodes */}
              {[{x:40,y:50,c:'#30d158'},{x:184,y:50,c:'#ff9f0a'},{x:30,y:150,c:'#ff453a'},{x:194,y:150,c:'#5e5ce6'},{x:112,y:20,c:'#bf5af2'},{x:112,y:204,c:'#0a84ff'}].map(({x,y,c},i) => (
                <div key={i} className="absolute" style={{
                  left:`${(x/224)*100}%`, top:`${(y/224)*100}%`,
                  transform:'translate(-50%,-50%)', width:'8px', height:'8px', borderRadius:'50%',
                  background:c, boxShadow:`0 0 10px ${c}80`,
                  animation:`node-pop 0.5s ease-out ${1.5+i*0.12}s both`, opacity:0,
                }} />
              ))}
            </div>

            {/* Loading text + progress */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-ink text-base font-semibold" style={{ animation:'text-fade 0.8s ease-out 1.8s both', opacity:0 }}>
                Network Monitor
              </p>
              <p className="text-ink-quaternary text-xs tracking-widest uppercase" style={{ animation:'text-fade 0.8s ease-out 2.1s both', opacity:0 }}>
                Initializing systems
              </p>
              <div className="w-40 h-[3px] rounded-full overflow-hidden mt-3" style={{ background:'rgba(255,255,255,0.06)', animation:'text-fade 0.5s ease-out 2.3s both', opacity:0 }}>
                <div className="h-full rounded-full" style={{
                  background:'linear-gradient(90deg, #0a84ff, #5e5ce6, #bf5af2)',
                  animation:'progress-fill 1.2s ease-in-out 2.4s both', width:'0%',
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MAIN CONTENT (stage: content) ════ */}
      {stage === 'content' && (
        <div
          className="flex flex-col min-h-screen"
          style={{ animation: `lp-swipe-in 0.7s cubic-bezier(0.16,1,0.3,1) both`, willChange: 'transform, opacity' }}
        >
          <TailwindNavbar />
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">

            {/* Background particles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
              {PARTICLES.map((p, i) => (
                <div key={i} className="absolute rounded-full" style={{
                  width:`${p.w}px`, height:`${p.h}px`, left:`${p.l}%`, top:`${p.t}%`,
                  background:'radial-gradient(circle, rgba(10,132,255,0.04) 0%, transparent 70%)',
                  animation:`landing-float ${p.dur}s ease-in-out infinite`, animationDelay:`${p.del}s`,
                }} />
              ))}
            </div>

            {/* Logo icon */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{
              background:'linear-gradient(135deg, #0a84ff, #5e5ce6)',
              boxShadow:'0 8px 32px rgba(10,132,255,0.3)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" />
                <path d="M5 12.859a10 10 0 0 1 14 0" /><path d="M8.5 16.429a5 5 0 0 1 7 0" />
              </svg>
            </div>

            {/* Headlines */}
            <h1 className="text-3xl sm:text-5xl font-extrabold text-ink text-center leading-tight mb-3"
              style={{ animation:'text-fade 0.5s ease-out 0.05s both', opacity:0 }}>
              Network <span style={{ color:'#0a84ff' }}>Monitor</span>
            </h1>
            <p className="text-ink-tertiary text-sm sm:text-base text-center max-w-md mb-8"
              style={{ animation:'text-fade 0.5s ease-out 0.15s both', opacity:0 }}>
              Real-time network intelligence, geolocation tracking &amp; security auditing — all from your browser.
            </p>

            {/* Google Sign-In */}
            <div
              className="w-full max-w-[300px] mb-10 flex justify-center relative group overflow-hidden rounded-full"
              style={{ animation:'text-fade 0.5s ease-out 0.25s both', opacity:0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine transition-transform pointer-events-none z-10" />
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
                useOneTap={false}
              />
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
              {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                <div key={title}
                  className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12] hover:-translate-y-0.5"
                  style={{ animation:`feature-rise 0.55s ease-out ${0.3 + i*0.07}s both`, opacity:0 }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background:'rgba(10,132,255,0.1)' }}>
                    <Icon className="w-[18px] h-[18px]" style={{ color:'#0a84ff' }} />
                  </div>
                  <h3 className="text-sm font-semibold text-ink mb-1">{title}</h3>
                  <p className="text-[11px] text-ink-quaternary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <p className="text-ink-quaternary text-[10px] mt-10 text-center"
              style={{ animation:'text-fade 0.5s ease-out 0.75s both', opacity:0 }}>
              Secure · Client-side analytics · Open Source
            </p>
          </div>
        </div>
      )}

      {/* ════ Keyframes ════ */}
      <style>{`
        @keyframes lp-swipe-out {
          0%   { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0px); }
          60%  { opacity: 0; transform: translateY(-48px) scale(0.97); filter: blur(3px); }
          100% { opacity: 0; transform: translateY(-64px) scale(0.96); filter: blur(6px); }
        }
        @keyframes lp-swipe-in {
          0%   { opacity: 0; transform: translateY(56px)  scale(0.97); filter: blur(4px); }
          60%  { opacity: 1; transform: translateY(-6px)  scale(1.01); filter: blur(0px); }
          100% { opacity: 1; transform: translateY(0)     scale(1);    filter: blur(0px); }
        }
        @keyframes scan-ring {
          0% { transform: scale(0.3); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        @keyframes ring-expand {
          0% { transform: scale(0.5); opacity: 0; }
          60% { opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg); opacity: 1; }
          100% { transform: rotate(360deg); opacity: 1; }
        }
        @keyframes dot-appear {
          0% { transform: translateX(-50%) scale(0); opacity: 0; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes core-appear {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes core-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes lines-appear {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes node-pop {
          0% { transform: translate(-50%,-50%) scale(0); opacity: 0; }
          70% { transform: translate(-50%,-50%) scale(1.4); }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        @keyframes text-fade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress-fill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes feature-rise {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes landing-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(2deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
