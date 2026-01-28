import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  initial: string;
  name: string;
  email: string;
  onSignOut: () => void;
}

export function UserMenu({
  isOpen,
  onClose,
  imageUrl,
  initial,
  name,
  email,
  onSignOut,
}: UserMenuProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <UserAvatar imageUrl={imageUrl} initial={initial} size="md" />
            <div>
              <h3 className="text-white font-semibold text-lg">{name}</h3>
              <p className="text-zinc-400 text-sm">{email}</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            className="w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors bg-zinc-300 hover:bg-zinc-400 text-zinc-900"
          >
            Sign Out
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
