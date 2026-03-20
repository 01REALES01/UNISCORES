import { render, screen } from "@testing-library/react";
import {
    Card,
    Badge,
    Button,
    Input,
    Avatar,
    ScoreDisplay,
    LiveIndicator,
} from "@/components/ui-primitives";

describe("UI Primitives", () => {
    // ===== CARD =====
    describe("Card", () => {
        it("renders children correctly", () => {
            render(<Card>Test Content</Card>);
            expect(screen.getByText("Test Content")).toBeInTheDocument();
        });

        it("applies default variant styles", () => {
            const { container } = render(<Card>Default</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain("bg-card");
        });

        it("applies glass variant", () => {
            const { container } = render(<Card variant="glass">Glass</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain("glass");
        });

        it("applies gradient variant", () => {
            const { container } = render(<Card variant="gradient">Gradient</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain("gradient-border");
        });

        it("merges custom className", () => {
            const { container } = render(<Card className="custom-class">Custom</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain("custom-class");
        });
    });

    // ===== BADGE =====
    describe("Badge", () => {
        it("renders with default variant", () => {
            render(<Badge>Default Badge</Badge>);
            const badge = screen.getByText("Default Badge");
            expect(badge).toBeInTheDocument();
            expect(badge.className).toContain("text-red-500");
        });

        it("renders destructive variant", () => {
            render(<Badge variant="destructive">Error</Badge>);
            const badge = screen.getByText("Error");
            expect(badge.className).toContain("bg-red-600/20");
        });

        it("renders success variant", () => {
            render(<Badge variant="success">Success</Badge>);
            const badge = screen.getByText("Success");
            expect(badge.className).toContain("text-emerald-500");
        });

        it("renders live variant with animation", () => {
            render(<Badge variant="live">LIVE</Badge>);
            const badge = screen.getByText("LIVE");
            expect(badge.className).toContain("live-indicator");
        });
    });

    // ===== BUTTON =====
    describe("Button", () => {
        it("renders button text", () => {
            render(<Button>Click Me</Button>);
            expect(screen.getByText("Click Me")).toBeInTheDocument();
        });

        it("handles click events", () => {
            const onClick = jest.fn();
            render(<Button onClick={onClick}>Click</Button>);
            screen.getByText("Click").click();
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("supports disabled state", () => {
            render(<Button disabled>Disabled</Button>);
            expect(screen.getByText("Disabled").closest("button")).toBeDisabled();
        });

        it("applies outline variant", () => {
            const { container } = render(<Button variant="outline">Outline</Button>);
            const btn = container.firstChild as HTMLElement;
            expect(btn.className).toContain("border-white/10");
        });

        it("applies ghost variant", () => {
            const { container } = render(<Button variant="ghost">Ghost</Button>);
            const btn = container.firstChild as HTMLElement;
            expect(btn.className).toContain("hover:bg-white/5");
        });

        it("applies different sizes", () => {
            const { container } = render(<Button size="sm">Small</Button>);
            const btn = container.firstChild as HTMLElement;
            expect(btn.className).toContain("h-9");
        });
    });

    // ===== INPUT =====
    describe("Input", () => {
        it("renders input element", () => {
            render(<Input placeholder="Enter text" />);
            expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
        });

        it("applies custom className", () => {
            const { container } = render(<Input className="custom-input" />);
            const input = container.firstChild as HTMLElement;
            expect(input.className).toContain("custom-input");
        });

        it("handles disabled state", () => {
            render(<Input disabled placeholder="Disabled" />);
            expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
        });
    });

    // ===== AVATAR =====
    describe("Avatar", () => {
        it("displays initials from name", () => {
            render(<Avatar name="Juan Perez" />);
            expect(screen.getByText("JU")).toBeInTheDocument();
        });

        it("applies size classes", () => {
            const { container } = render(<Avatar name="Test" size="lg" />);
            const avatar = container.firstChild as HTMLElement;
            expect(avatar.className).toContain("w-16");
        });

        it("uses consistent colors based on name", () => {
            const { container: c1 } = render(<Avatar name="Alpha" />);
            const { container: c2 } = render(<Avatar name="Alpha" />);
            expect((c1.firstChild as HTMLElement).className).toBe(
                (c2.firstChild as HTMLElement).className
            );
        });
    });

    // ===== SCORE DISPLAY =====
    describe("ScoreDisplay", () => {
        it("renders both scores", () => {
            render(<ScoreDisplay scoreA={3} scoreB={1} />);
            expect(screen.getByText("3")).toBeInTheDocument();
            expect(screen.getByText("1")).toBeInTheDocument();
        });

        it("renders custom separator", () => {
            render(<ScoreDisplay scoreA={2} scoreB={2} separator="-" />);
            expect(screen.getByText("-")).toBeInTheDocument();
        });

        it("applies size variant", () => {
            const { container } = render(<ScoreDisplay scoreA={0} scoreB={0} size="lg" />);
            const display = container.firstChild as HTMLElement;
            expect(display.className).toContain("text-5xl");
        });
    });

    // ===== LIVE INDICATOR =====
    describe("LiveIndicator", () => {
        it("renders En Curso text", () => {
            render(<LiveIndicator />);
            expect(screen.getByText("En Curso")).toBeInTheDocument();
        });

        it("contains animated ping element", () => {
            const { container } = render(<LiveIndicator />);
            const ping = container.querySelector(".animate-ping");
            expect(ping).toBeInTheDocument();
        });
    });
});
