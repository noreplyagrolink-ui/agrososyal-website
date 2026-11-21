import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/loading.json";

const Loading = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/choose", { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-72 h-72">
        <Lottie animationData={loadingAnimation} loop autoplay />
      </div>
      <p className="mt-6 text-muted-foreground text-sm tracking-wide">
        Hesabınız hazırlanıyor...
      </p>
    </div>
  );
};

export default Loading;

