import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,color,border-color,opacity,box-shadow] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-glacier active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-chalk text-void hover:bg-signal hover:text-white",
        secondary:
          "bg-transparent text-chalk border border-chalk/30 hover:border-chalk hover:bg-chalk/5",
        ghost: "bg-transparent text-chalk hover:bg-white/8",
        magma: "bg-magma text-void hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3.5 text-sm rounded-[10px]",
        md: "h-11 px-5 text-[15px] rounded-[10px]",
        lg: "h-12 px-6 text-base rounded-[10px]",
        pill: "h-11 px-5 text-[15px] rounded-[4px]",
        icon: "size-11 rounded-[10px]",
        "icon-sm": "size-9 rounded-[10px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
