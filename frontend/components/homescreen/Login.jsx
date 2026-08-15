import { useState } from 'react';

export default function Login() {
  // State for form inputs and API handling
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Reset previous errors and start loading
    setError('');
    setIsLoading(true);

    // SIMULATED API CALL
    // Replace this setTimeout with your actual fetch/axios request
    setTimeout(() => {
      // Fake validation error logic
      if (email !== 'hello@example.com' || password !== 'password123') {
        setError('Incorrect email or password. Please try again.');
        setIsLoading(false);
      } else {
        // Success logic here (e.g., redirect to dashboard)
        alert('Login successful!');
        setIsLoading(false);
      }
    }, 2000); // Fakes a 2-second network request
  };

  return (
    <div className="relative isolate w-full min-h-[100dvh] flex items-center justify-center p-6 overflow-hidden">
      
      {/* Main Glass Card */}
      <div className="w-full max-w-sm p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col gap-6 text-white">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-wider mb-1 shadow-black/50 drop-shadow-lg">
            Welcome
          </h1>
          <p className="text-white/90 text-sm font-light drop-shadow-md">
            Sign in to continue
          </p>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 backdrop-blur-md flex items-center justify-center">
            <p className="text-red-100 text-sm text-center font-medium drop-shadow-md">
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={handleLogin}>
          
          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs ml-1 text-white/90 font-medium tracking-wide drop-shadow-md">
              Email
            </label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all placeholder:text-white/50 text-white shadow-inner"
              placeholder="hello@example.com"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs ml-1 text-white/90 font-medium tracking-wide drop-shadow-md">
              Password
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:bg-white/20 focus:border-white/40 focus:outline-none transition-all placeholder:text-white/50 text-white shadow-inner"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className={`relative mt-2 w-full h-[52px] rounded-xl border border-white/30 backdrop-blur-md font-semibold tracking-wide transition-all shadow-lg flex justify-center items-center overflow-hidden group
              ${isLoading ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`
            }
          >
            {/* The GIF Background */}
            <img 
              src="/output.gif" 
              alt="button animation"
              className="absolute inset-0 w-full h-full object-cover -z-10 opacity-70 group-hover:opacity-100 transition-opacity duration-300" 
            />
            
            {/* Dynamic Button Content: Spinner OR Text */}
            {isLoading ? (
              // Tailwind CSS Spinner
              <svg 
                className="animate-spin h-6 w-6 text-white relative z-10" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              // Normal Text
              <span className="relative z-10 text-[#f9f2f2] font-extrabold text-2xl drop-shadow-md">
                Sign In
              </span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}