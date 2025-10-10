import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
};

interface DialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog: React.FC<DialogProps> = ({ 
  children, 
  open: controlledOpen, 
  onOpenChange 
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children }) => {
  const { setOpen } = useDialog();
  
  return (
    <div onClick={() => setOpen(true)} className="cursor-pointer">
      {children}
    </div>
  );
};

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ 
  children, 
  className = '' 
}) => {
  const { open, setOpen } = useDialog();
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => setOpen(false)}
      />
      
      {/* Dialog */}
      <div className={`relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-auto ${className}`}>
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
};

interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-0 ${className}`}>
      {children}
    </div>
  );
};

interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
};

interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      {children}
    </p>
  );
};

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
};