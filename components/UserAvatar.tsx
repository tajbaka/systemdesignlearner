import Image from "next/image";

interface UserAvatarProps {
  imageUrl?: string;
  initial: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-10 h-10 text-lg",
  md: "w-16 h-16 text-2xl",
  lg: "w-24 h-24 text-4xl",
};

export function UserAvatar({ imageUrl, initial, size = "md" }: UserAvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 flex items-center justify-center relative`}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="Profile" fill className="object-cover" />
      ) : (
        <span className="text-white font-semibold">{initial}</span>
      )}
    </div>
  );
}
