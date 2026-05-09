import * as React from "react";
import { svgPaths } from "./chat-icons";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AttachmentMenu } from "./AttachmentMenu";
import vvaiWordmark from "../../assets/vvai-wordmark.png";

// Data URIs from the import
const imgBackground = "data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%20769%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Crect%20id%3D%22%26%23229%3B%26%23137%3B%26%23170%3B%26%23229%3B%26%23136%3B%26%23135%3B%26%23232%3B%26%23146%3B%26%23153%3B%26%23231%3B%26%23137%3B%26%23136%3B%22%20width%3D%22769%22%20height%3D%228%22%20fill%3D%22url(%23paint0_linear_11_5638)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_11_5638%22%20x1%3D%22384.5%22%20y1%3D%220%22%20x2%3D%22384.5%22%20y2%3D%228%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22white%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A";
const imgWhite = "data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%201519%20380%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Crect%20id%3D%22Zone%22%20width%3D%221519%22%20height%3D%22379.5%22%20fill%3D%22url(%23paint0_linear_11_5636)%22%2F%3E%0A%3Cdefs%3E%0A%3ClinearGradient%20id%3D%22paint0_linear_11_5636%22%20x1%3D%22793.931%22%20y1%3D%22189.75%22%20x2%3D%22793.931%22%20y2%3D%22320.85%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%0A%3Cstop%20stop-color%3D%22white%22%2F%3E%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23FAFBFC%22%20stop-opacity%3D%220%22%2F%3E%0A%3C%2FlinearGradient%3E%0A%3C%2Fdefs%3E%0A%3C%2Fsvg%3E%0A";

export function MenuIcon() {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <path d={svgPaths.p8cb6080} fill="var(--fill-0, #2A2F3C)" />
        <path d={svgPaths.p1ed38600} fill="var(--fill-0, #2A2F3C)" />
      </svg>
    </div>
  );
}

/**
 * 全局 VVAI 品牌字标（与产品截图一致：暖橙金色、几何无衬线字标）。
 * 使用位图以保证各端渲染与品牌素材 1:1；高度锚定顶栏字号 token。
 */
export function VvAiLogo() {
  return (
    <img
      src={vvaiWordmark}
      alt="VVAI"
      width={72}
      height={20}
      draggable={false}
      className="h-[var(--font-size-lg)] w-auto max-w-[min(100%,5.5rem)] shrink-0 select-none object-contain object-left"
    />
  )
}

export function NewMessageIcon() {
  return (
    <div className="relative shrink-0 size-[20px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <path d={svgPaths.p25eb1000} fill="var(--color-text)" />
        <path d={svgPaths.p1cd208f0} fill="var(--color-text)" />
      </svg>
    </div>
  );
}

export function TimestampSeparator({ time }: { time: string }) {
  return (
    <div className="flex justify-center w-full my-[var(--space-600)]">
      <div className="rounded-[var(--radius-full)] bg-transparent">
        <p className="text-[var(--color-text-muted)] text-[length:var(--font-size-xs)] leading-[16px]">{time}</p>
      </div>
    </div>
  )
}

function Background1() {
  return (
    <div className="absolute h-[379.5px] left-[-375px] right-[-375px] top-0 pointer-events-none">
      <div className="absolute flex inset-[-39.56%_22.93%_-3.02%_35.44%] items-center justify-center">
        <div className="flex-none h-[526.772px] rotate-[358.69deg] skew-x-[358.134deg] w-[627.392px]">
          <div 
            className="relative size-full"
            style={{ 
              maskImage: `url('${imgWhite}')`,
              WebkitMaskImage: `url('${imgWhite}')`,
              maskSize: '1519px 379.5px',
              WebkitMaskSize: '1519px 379.5px',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: '-538.328px 150.136px',
              WebkitMaskPosition: '-538.328px 150.136px'
            }}
          >
            <div className="absolute inset-[-56%_-47.02%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1218 1117">
                <g filter="url(#filter0_f_bg1)" opacity="0.3">
                  <ellipse cx="608.689" cy="558.38" fill="var(--blue-11)" rx="313.696" ry="263.386" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1116.76" id="filter0_f_bg1" width="1217.38" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_bg1" stdDeviation="147.497" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div 
        className="absolute h-[504.85px] left-[170px] top-[-149.5px] w-[490px]"
        style={{ 
          maskImage: `url('${imgWhite}')`,
          WebkitMaskImage: `url('${imgWhite}')`,
          maskSize: '1519px 379.5px',
          WebkitMaskSize: '1519px 379.5px',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: '-170px 149.5px',
          WebkitMaskPosition: '-170px 149.5px'
        }}
      >
        <div className="absolute inset-[-53.1%_-54.71%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1027 1041">
            <g filter="url(#filter0_f_bg2)" opacity="0.3">
              <ellipse cx="513.071" cy="520.496" fill="var(--blue-11)" rx="245" ry="252.425" />
            </g>
            <defs>
              <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1040.99" id="filter0_f_bg2" width="1026.14" x="0" y="0">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                <feGaussianBlur result="effect1_foregroundBlur_bg2" stdDeviation="134.035" />
              </filter>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}

export function ChatBackground() {
  return (
    <div className="absolute bg-cui-bg inset-0 overflow-hidden z-[0]">
      <div className="absolute bottom-[183px] h-[346px] right-[-118px] w-[323px]">
        <div className="absolute inset-[-77.48%_-82.99%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 860 883">
            <g filter="url(#filter0_f_bg3)" opacity="0.3">
              <ellipse cx="429.571" cy="441.071" fill="var(--blue-11)" rx="161.5" ry="173" />
            </g>
            <defs>
              <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="882.142" id="filter0_f_bg3" width="859.142" x="0" y="0">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                <feGaussianBlur result="effect1_foregroundBlur_bg3" stdDeviation="134.035" />
              </filter>
            </defs>
          </svg>
        </div>
      </div>
      <Background1 />
    </div>
  );
}

export function AudioIcon() {
  return (
    <div className="relative shrink-0 size-[22px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g>
          <path clipRule="evenodd" d={svgPaths.p3fe6b100} fill="url(#paint0_linear_audio)" fillRule="evenodd" />
          <path d={svgPaths.p29810d00} fill="url(#paint1_linear_audio)" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_audio" x1="7.05586" x2="29.1678" y1="1.81473" y2="9.12794">
            <stop offset="0.025" stopColor="#73AEFF" />
            <stop offset="0.668962" stopColor="#863CFF" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_audio" x1="7.05586" x2="29.1678" y1="1.81473" y2="9.12794">
            <stop offset="0.025" stopColor="#73AEFF" />
            <stop offset="0.668962" stopColor="#863CFF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function AddIcon() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative shrink-0 size-[22px] cursor-pointer">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
            <g>
              <path d={svgPaths.p25e11a00} fill="var(--fill-0, #858B9B)" />
              <path clipRule="evenodd" d={svgPaths.p27386300} fill="var(--fill-0, #858B9B)" fillRule="evenodd" />
            </g>
          </svg>
        </div>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[140px] p-0 border-none bg-transparent shadow-[0px_4px_16px_0px_rgba(20,24,36,0.06)]">
        <AttachmentMenu />
      </PopoverContent>
    </Popover>
  );
}

export function SendIcon() {
  return (
    <div className="relative shrink-0 size-[24px]">
      <div className="absolute blur-[3.429px] filter left-0 opacity-40 rounded-[12.8px] size-[24px] top-0 bg-[#73AEFF]" />
      <div className="absolute left-0 rounded-[12.8px] size-[24px] top-0 bg-[#73AEFF]" />
      <div className="absolute h-[14px] left-[4px] top-[5.5px] w-[13.653px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
          <g>
            <path d={svgPaths.p3442f320} fill="white" fillOpacity="0.8" opacity="0.5" />
            <path d={svgPaths.pba63100} fill="white" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export function ExcelIcon() {
  return (
    <div className="relative shrink-0 size-[44px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 44">
        <g>
          <path d={svgPaths.p7dcf100} fill="#44C69D" />
          <path d={svgPaths.p150ca00} fill="#31AE88" />
          <path d={svgPaths.p2c131d00} fill="white" />
        </g>
      </svg>
    </div>
  );
}

export function ArrowIcon() {
  return (
    <div className="relative size-[16px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g>
          <path d={svgPaths.p5555f00} fill="#49536C" />
          <path d={svgPaths.p5555f00} fill="url(#paint0_linear_arrow)" />
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_arrow" x1="1.5" x2="17.9569" y1="3.16667" y2="6.10127">
            <stop offset="0.025" stopColor="#3C8EFF" />
            <stop offset="0.14" stopColor="#3C8EFF" />
            <stop offset="1" stopColor="#5B61F7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export const HeaderGradient = () => (
  <div className="absolute bottom-[-8px] h-[8px] left-[0.17px] overflow-clip right-[-0.17px] z-10 pointer-events-none">
    <div 
      className="absolute bottom-[-331.5px] h-[379.5px] left-[-375.17px] right-[-374.83px]" 
      style={{ 
        maskImage: `url('${imgBackground}')`,
        WebkitMaskImage: `url('${imgBackground}')`,
        maskSize: '50.63% 8px',
        WebkitMaskSize: '50.63% 8px',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: '24.7% 40px',
        WebkitMaskPosition: '24.7% 40px'
      }}
    >
      <div className="absolute bg-cui-bg bottom-[56.36%] left-0 right-0 top-0" />
    </div>
  </div>
);
