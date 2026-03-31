import ConfirmDialog from "@/components/shared/ConfirmDialog";

type AuthErrorScreenProps = {
  open: boolean;
  message: string;
  onClose: () => void;
};

/**
 * Full-screen error screen shown when user is illegal or prohibited.
 * Used by admin pages that share the same error UI and close behavior.
 */
const AuthErrorScreen = ({ open, message, onClose }: AuthErrorScreenProps) => (
  <div className="min-h-screen flex flex-col items-center justify-center relative text-white bg-gray-200">
    <ConfirmDialog
      open={open}
      onClose={onClose}
      status="fail"
      message={message}
    />
  </div>
);

export default AuthErrorScreen;
