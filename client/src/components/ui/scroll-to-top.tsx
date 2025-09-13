import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full",
        "bg-gradient-to-r from-purple-600 to-purple-700",
        "shadow-lg hover:shadow-xl hover:scale-110",
        "transition-all duration-500",
        "before:absolute before:inset-0 before:rounded-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent",
        "before:translate-x-[-200%] hover:before:translate-x-[200%]",
        "before:transition-transform before:duration-700",
        isVisible 
          ? "opacity-100 translate-y-0 animate-bounceIn" 
          : "opacity-0 translate-y-20 pointer-events-none"
      )}
      size="icon"
      aria-label="Scroll to top"
      data-testid="scroll-to-top"
    >
      <ArrowUp className="h-5 w-5 animate-bounce" />
    </Button>
  );
}