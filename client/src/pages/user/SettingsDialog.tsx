import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const MUSIC_OPTIONS = [
  { value: "classic", label: "古典" },
  { value: "lyrical", label: "抒情" },
  { value: "nature", label: "自然" },
  { value: "nostalgia", label: "怀旧" },
  { value: "romantic", label: "浪漫" },
];

const VOICE_OPTIONS = [
  { value: "zh", label: "普通话" },
  { value: "en", label: "英文" },
  { value: "yue", label: "粤语" },
];

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const [musicType, setMusicType] = useState("romantic");
  const [voiceLang, setVoiceLang] = useState("en");
  const [bgm, setBgm] = useState(false);
  const [sfx, setSfx] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-1/2 h-2/3 bg-green-900 rounded-lg overflow-hidden border border-yellow-600/30">
        <div className="flex items-center justify-between px-6 py-4 bg-green-700">
          <div className="text-5xl text-white font-semibold">声音偏好</div>
          <button
            onClick={onClose}
            className="text-yellow-400 hover:scale-110 transition"
          >
            <Icon
              icon="material-symbols:close-rounded"
              width="50"
              className="cursor-pointer"
            />
          </button>
        </div>

        <div
          className={cn(
            "text-white",
            "p-12 lg:p-20",
            "gap-14 md:gap-16",
            "flex flex-col",
          )}
        >
          <div>
            <div className="mb-2 text-white text-xl md:mb-3 md:text-3xl">
              音乐曲目
            </div>
            <Select value={musicType} onValueChange={setMusicType}>
              <SelectTrigger
                className={cn(
                  "bg-gray-300 border-none cursor-pointer text-black w-full rounded-md",
                  "h-14 text-lg py-2",
                  "md:text-xl md:py-2",
                  "lg:text-2xl lg:py-3",
                )}
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="w-full h-auto">
                {MUSIC_OPTIONS.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    className="text-xs py-0.5 md:text-lg lg:text-xl"
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-2 text-white text-xl md:mb-3 md:text-3xl">
              语言版本
            </div>

            <Select value={voiceLang} onValueChange={setVoiceLang}>
              <SelectTrigger
                className={cn(
                  "bg-gray-300 border-none cursor-pointer text-black w-full rounded-md",
                  "h-14 text-lg py-2",
                  "md:text-xl md:py-2",
                  "lg:text-2xl lg:py-3",
                )}
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="w-full h-auto">
                {VOICE_OPTIONS.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    className="text-xs py-0.5 md:text-lg lg:text-xl"
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5 space-y-4 md:space-y-8 lg:space-y-10 text-3xl">
            <SettingSwitch label="背景音乐" value={bgm} onChange={setBgm} />
            <SettingSwitch label="游戏音效" value={sfx} onChange={setSfx} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;

const SettingSwitch = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <div>{label}</div>
    <button
      onClick={() => onChange(!value)}
      className={`w-[80px] h-[40px] rounded-md text-xl font-semibold cursor-pointer transition
        ${value ? "bg-green-500 text-black" : "bg-orange-500 text-white"}
      `}
    >
      {value ? "ON" : "OFF"}
    </button>
  </div>
);
