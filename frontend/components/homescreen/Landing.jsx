export default function Landing() {
  return (
    <div className="bg-linear-[0deg,#1114180%,#111418100%),#FF] min-w-screen min-h-screen">
      {/* <img
        src="/untitled.png"
        className="w-full h-full absolute left-0 top-0 max-w-none"
        alt="Background Image"
      /> */}
      <div className="flex pt-12 pr-0 pb-4 pl-0 justify-center items-center w-full h-24 absolute left-0 top-0">
        <div className="flex justify-center items-center shrink-0 w-full h-8">
          <button className="cursor-pointer text-nowrap flex justify-center items-center shrink-0 opacity-90 shadow-[04px3px0rgba(0,0,0,0.10),010px8px0rgba(0,0,0,0.04)] w-[99px] h-8">
            <p className="text-[#FFF] font-manrope text-2xl font-bold leading-[31.2px] w-[99px] h-8 tracking-[0.1em]">
              KIMI NO
            </p>
          </button>
        </div>
      </div>
      <div className="flex flex-col justify-center items-start w-[292px] absolute left-[49px] top-[787px]">
        <button className="cursor-pointer text-nowrap flex pt-4 pr-12 pb-4 pl-12 flex-col justify-center items-center rounded-full border border-[rgba(255,255,255,0.30)] bg-[] shadow-[04px20px0rgba(255,255,255,0.10)] w-full">
          <p className="text-white font-hankenGrotesk text-xs font-semibold leading-[14.4px] w-fit tracking-[0.1em]">
            GET STARTED
          </p>
        </button>
      </div>
      <p className="text-[#BAD3E3] font-roboto text-[57px] font-medium leading-[64px] w-[322px] h-[136px] absolute left-[27px] top-[640px]">
        Search your Mitsuha
      </p>
    </div>
  );
}