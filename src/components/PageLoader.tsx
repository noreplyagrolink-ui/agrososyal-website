import Lottie from "lottie-react";
import loadingAnim from "@/assets/loading.json";

interface PageLoaderProps {
  fullscreen?: boolean;
  size?: number;
}

const PageLoader = ({ fullscreen = false, size = 140 }: PageLoaderProps) => {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in">
        <Lottie animationData={loadingAnim} loop autoplay style={{ width: size, height: size }} />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-10">
      <Lottie animationData={loadingAnim} loop autoplay style={{ width: size, height: size }} />
    </div>
  );
};

export default PageLoader;

