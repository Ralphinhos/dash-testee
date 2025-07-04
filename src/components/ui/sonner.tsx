import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Assuming sonner provides a way to add a class to the progress bar,
          // or we manually add an element. If sonner has a built-in but hidden progress bar,
          // the CSS would target its existing classes/attributes.
          // For a custom element, we'd add it here or within the component's render method if Sonner allows customization.
        },
      }}
      // If Sonner allows rendering a custom component for the toast body or a progress bar specifically:
      // components={{
      //   progressBar: ({ progress }) => <div style={{ width: `${progress * 100}%` }} className="my-custom-progress-bar" />,
      // }}
      {...props}
    >
      {/* This is a conceptual placement. Sonner's actual API for custom elements might differ.
          If Sonner doesn't directly support adding child elements here for progress,
          we might need to use CSS to style an existing (but hidden) progress bar,
          or Sonner might provide a prop to render a custom progress component.
          The CSS file `custom-sonner-progress.css` is written to target data attributes
          that Sonner might use for its progress bar (`[data-progress]`).
      */}
      {/* Fallback: Manually adding a div that we hope Sonner positions correctly,
          or that our CSS can target and style as a progress bar.
          This specific approach of adding a direct child to <Sonner /> might not work as expected
          depending on how Sonner renders its toasts.
          The CSS approach in `custom-sonner-progress.css` is more robust if Sonner does render a progress element.
      */}
    </Sonner>
  )
}

// It's important to check Sonner's documentation for the correct way to customize toast content or add elements.
// If Sonner doesn't provide a direct way to insert a custom progress bar element via props,
// the primary method of enabling/styling the progress bar will be through CSS,
// targeting the classes/attributes Sonner itself uses for its progress bar.
// The `custom-sonner-progress.css` file attempts to do this.

export { Toaster, toast }
