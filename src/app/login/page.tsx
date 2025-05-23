// // app/login/page.tsx or pages/login.tsx
// 'use client';
// import { useState } from 'react';
// import { supabase } from '../../../lib/supabaseClient';
// import { useRouter } from 'next/navigation';

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const router = useRouter();

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     setLoading(false);

//     if (error) {
//       setError(error.message);
//     } else {
//       router.push('/chats'); // redirect to chats page
//     }
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-50">
//       <form
//         onSubmit={handleLogin}
//         className="bg-white p-8 rounded-lg shadow-md flex flex-col gap-4 w-80"
//       >
//         <h1 className="text-2xl font-bold mb-2 text-center">Login</h1>
//         <input
//           className="border rounded px-3 py-2"
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={e => setEmail(e.target.value)}
//           required
//         />
//         <input
//           className="border rounded px-3 py-2"
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={e => setPassword(e.target.value)}
//           required
//         />
//         <button
//           className="bg-green-500 text-white rounded px-3 py-2 font-semibold hover:bg-green-600 transition"
//           type="submit"
//           disabled={loading}
//         >
//           {loading ? 'Logging in...' : 'Login'}
//         </button>
//         {error && (
//           <div className="text-red-500 text-center text-sm">{error}</div>
//         )}
//       </form>
//     </div>
//   );
// }


// 'use client';
// import { useState } from 'react';
// import { supabase } from '../../../lib/supabaseClient';
// import { useRouter } from 'next/navigation';

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const router = useRouter();

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     setLoading(false);

//     if (error) {
//       setError(error.message);
//     } else {
//       router.push('/chats'); // redirect to chats page
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-200">
//       <form
//         onSubmit={handleLogin}
//         className="bg-white shadow-lg rounded-xl px-8 py-10 flex flex-col gap-4 w-full max-w-sm"
//       >
//         <h1 className="text-3xl font-bold text-center text-green-700 mb-2">Periskope Login</h1>
//         <input
//           className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={e => setEmail(e.target.value)}
//           required
//         />
//         <input
//           className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={e => setPassword(e.target.value)}
//           required
//         />
//         <button
//           className="bg-green-500 text-white rounded px-3 py-2 font-semibold hover:bg-green-600 transition mt-2"
//           type="submit"
//           disabled={loading}
//         >
//           {loading ? 'Logging in...' : 'Login'}
//         </button>
//         {error && (
//           <div className="text-red-500 text-center text-sm">{error}</div>
//         )}
//       </form>
//     </div>
//   );
// }


'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // Handle Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) setError(error.message);
    else router.push('/chats');
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) setError(error.message);
    else setMsg('Registration successful! Please check your email to verify your account.');
  };

  // Handle Magic Link Login
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);

    if (error) setError(error.message);
    else setMsg('Magic link sent! Please check your email to sign in.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-200">
      <form className="bg-white shadow-lg rounded-xl px-8 py-10 flex flex-col gap-4 w-full max-w-sm">
        <div className="flex justify-center mb-2">
          <button
            type="button"
            className={`px-4 py-2 font-bold rounded-l ${tab === 'login' ? 'bg-green-500 text-white' : 'bg-gray-200 text-green-700'}`}
            onClick={() => { setTab('login'); setError(''); setMsg(''); }}
          >
            Login
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-bold rounded-r ${tab === 'register' ? 'bg-green-500 text-white' : 'bg-gray-200 text-green-700'}`}
            onClick={() => { setTab('register'); setError(''); setMsg(''); }}
          >
            Register
          </button>
        </div>
        <h1 className="text-2xl font-bold text-center text-green-700 mb-2">
          {tab === 'login' ? 'Periskope Login' : 'Register New Account'}
        </h1>
        <input
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required={tab !== 'login' || password !== ''}
        />

        {tab === 'login' ? (
          <>
            <button
              className="bg-green-500 text-white rounded px-3 py-2 font-semibold hover:bg-green-600 transition mt-2"
              type="submit"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button
              className="bg-blue-500 text-white rounded px-3 py-2 font-semibold hover:bg-blue-600 transition"
              type="button"
              disabled={loading}
              onClick={handleMagicLink}
            >
              {loading ? 'Sending link...' : 'Send Magic Link'}
            </button>
          </>
        ) : (
          <button
            className="bg-green-500 text-white rounded px-3 py-2 font-semibold hover:bg-green-600 transition mt-2"
            type="submit"
            disabled={loading}
            onClick={handleRegister}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        )}
        {msg && (
          <div className="text-green-700 text-center text-sm">{msg}</div>
        )}
        {error && (
          <div className="text-red-500 text-center text-sm">{error}</div>
        )}
      </form>
    </div>
  );
}
