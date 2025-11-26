import { motion } from 'framer-motion';
import { ChefHat, Sparkles } from 'lucide-react';
import robotWaiterImage from '@/assets/ChatGPT Image Oct 22, 2025, 07_35_55 PM_1761180288922.png';
import { useLanguage } from '@/contexts/LanguageContext';

interface WelcomeOverlayProps {
  restaurantName: string;
  onDismiss: () => void;
}

export function WelcomeOverlay({ restaurantName, onDismiss }: WelcomeOverlayProps) {
  const { t } = useLanguage();
  
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleInteraction}
      onTouchEnd={handleInteraction}
      data-testid="welcome-overlay"
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-lg" />
      
      {/* Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6 px-8 py-12 max-w-md mx-4"
      >
        {/* Robot waiter with glow effect */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, type: "spring", bounce: 0.5 }}
          className="relative"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl scale-125" />
          
          {/* Robot image */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/80 shadow-2xl">
            <img 
              src={robotWaiterImage} 
              alt="AI Waiter" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Sparkle decorations */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-6 h-6 text-primary" fill="currentColor" />
          </motion.div>
        </motion.div>

        {/* Welcome text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-primary">
            <ChefHat className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              {restaurantName}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">
            {t('welcome')}
          </h1>
          
          <p className="text-muted-foreground text-base">
            {t('meetYourAIWaiter')}
          </p>
        </motion.div>

        {/* Tap to start button */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, duration: 0.4, type: "spring" }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          {/* Pulsing ring animation */}
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-primary/30"
          />
          
          {/* Button */}
          <button
            className="relative bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-semibold shadow-lg"
            data-testid="button-tap-to-start"
          >
            {t('tapToStart')}
          </button>
        </motion.div>

        {/* Helper text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="text-xs text-muted-foreground text-center"
        >
          {t('tapAnywhereToContinue')}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
