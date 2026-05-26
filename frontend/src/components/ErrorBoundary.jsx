import { Component } from "react";
import { Mountain } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("PunyaVerse caught:", error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg =
      typeof this.state.error === "string"
        ? this.state.error
        : this.state.error?.message || "Something divine went off-path.";
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-background mandala-bg">
        <div className="max-w-md text-center">
          <Mountain className="h-10 w-10 text-gold mx-auto" />
          <h1 className="font-display text-3xl mt-4">Pause and breathe 🙏</h1>
          <p className="text-sm text-muted-foreground mt-3">{msg}</p>
          <button
            onClick={() => { this.reset(); window.location.href = "/"; }}
            className="mt-6 rounded-md bg-gold hover:bg-gold-hover text-himalaya-900 px-5 py-2 text-sm font-medium"
            data-testid="error-reset-btn"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }
}
