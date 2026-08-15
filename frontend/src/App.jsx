import Landing from '../components/homescreen/Landing'
import Login from '../components/homescreen/Login'

function App() {
  return (
    <div className="w-full min-h-screen bg-[#082c4f] flex justify-center items-center sm:p-6">
      
      {/* Phone Frame: Now uses 'overflow-hidden' to lock the shape */}
      <div className="relative transform overflow-hidden w-full h-[100dvh] max-w-[430px] sm:h-[850px] sm:max-h-[90vh] bg-[#3fa5dd] sm:rounded-[2.5rem] sm:border-[8px] border-gray-900 shadow-2xl flex flex-col">
        
        {/* SHARED FIXED BACKGROUND */}
        {/* This stays completely still while the content scrolls */}
        <img
          src="/untitled.png"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          alt="App background"
        />

        {/* SCROLLABLE CONTENT AREA */}
        {/* This div scrolls over the background image */}
        <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col">
          <Landing/>
          <Login/>
        </div>
        
      </div>

    </div>
  );
}

export default App;