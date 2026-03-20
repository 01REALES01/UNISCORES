import { render, screen } from "@testing-library/react";
import {
    BarChart,
    DonutChart,
    MiniLineChart,
    ProgressBar,
    StatMiniCard,
} from "@/components/charts";

describe("Chart Components", () => {
    // ===== BAR CHART =====
    describe("BarChart", () => {
        const mockData = [
            { label: "Fútbol", value: 10, icon: "⚽" },
            { label: "Basket", value: 8, icon: "🏀" },
            { label: "Voley", value: 5, icon: "🏐" },
        ];

        it("renders the chart container", () => {
            render(<BarChart data={mockData} />);
            expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
        });

        it("renders labels for each data point", () => {
            render(<BarChart data={mockData} />);
            expect(screen.getByText("Fútbol")).toBeInTheDocument();
            expect(screen.getByText("Basket")).toBeInTheDocument();
            expect(screen.getByText("Voley")).toBeInTheDocument();
        });

        it("renders icons when provided", () => {
            render(<BarChart data={mockData} />);
            expect(screen.getByText("⚽")).toBeInTheDocument();
            expect(screen.getByText("🏀")).toBeInTheDocument();
        });

        it("renders values when showValues is true", () => {
            render(<BarChart data={mockData} showValues={true} />);
            expect(screen.getByText("10")).toBeInTheDocument();
            expect(screen.getByText("8")).toBeInTheDocument();
        });

        it("handles empty data gracefully", () => {
            const { container } = render(<BarChart data={[]} />);
            expect(container).toBeTruthy();
        });

        it("handles single data point", () => {
            render(<BarChart data={[{ label: "Solo", value: 5 }]} />);
            expect(screen.getByText("Solo")).toBeInTheDocument();
        });
    });

    // ===== DONUT CHART =====
    describe("DonutChart", () => {
        const mockData = [
            { label: "Finalizados", value: 15, color: "#34d399" },
            { label: "En Curso", value: 3, color: "#f87171" },
            { label: "Programados", value: 7, color: "#60a5fa" },
        ];

        it("renders the donut chart", () => {
            render(<DonutChart data={mockData} />);
            expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
        });

        it("displays total in center by default", () => {
            render(<DonutChart data={mockData} />);
            expect(screen.getByText("25")).toBeInTheDocument(); // 15 + 3 + 7
            expect(screen.getByText("Total")).toBeInTheDocument();
        });

        it("displays custom center label", () => {
            render(<DonutChart data={mockData} centerLabel="Partidos" centerValue={42} />);
            expect(screen.getByText("42")).toBeInTheDocument();
            expect(screen.getByText("Partidos")).toBeInTheDocument();
        });

        it("renders legend items", () => {
            render(<DonutChart data={mockData} />);
            expect(screen.getByText("Finalizados")).toBeInTheDocument();
            expect(screen.getByText("En Curso")).toBeInTheDocument();
            expect(screen.getByText("Programados")).toBeInTheDocument();
        });

        it("renders percentage labels", () => {
            render(<DonutChart data={mockData} />);
            expect(screen.getByText("60%")).toBeInTheDocument(); // 15/25
            expect(screen.getByText("12%")).toBeInTheDocument(); // 3/25
            expect(screen.getByText("28%")).toBeInTheDocument(); // 7/25
        });

        it("handles all-zero values", () => {
            const zeroData = [
                { label: "A", value: 0, color: "#000" },
                { label: "B", value: 0, color: "#111" },
            ];
            render(<DonutChart data={zeroData} />);
            expect(screen.getByText("0")).toBeInTheDocument();
        });
    });

    // ===== MINI LINE CHART =====
    describe("MiniLineChart", () => {
        const mockData = [
            { label: "Lun", value: 3 },
            { label: "Mar", value: 5 },
            { label: "Mié", value: 2 },
            { label: "Jue", value: 8 },
            { label: "Vie", value: 4 },
        ];

        it("renders the chart", () => {
            render(<MiniLineChart data={mockData} />);
            expect(screen.getByTestId("mini-line-chart")).toBeInTheDocument();
        });

        it("renders x-axis labels", () => {
            render(<MiniLineChart data={mockData} />);
            expect(screen.getByText("Lun")).toBeInTheDocument();
            expect(screen.getByText("Vie")).toBeInTheDocument();
        });

        it("returns null for insufficient data", () => {
            const { container } = render(
                <MiniLineChart data={[{ label: "Solo", value: 1 }]} />
            );
            expect(container.firstChild).toBeNull();
        });

        it("renders SVG with line path", () => {
            const { container } = render(<MiniLineChart data={mockData} />);
            const paths = container.querySelectorAll("path");
            expect(paths.length).toBeGreaterThanOrEqual(2); // area + line
        });
    });

    // ===== PROGRESS BAR =====
    describe("ProgressBar", () => {
        it("renders the progress bar", () => {
            render(<ProgressBar value={75} />);
            expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
        });

        it("displays percentage", () => {
            render(<ProgressBar value={75} />);
            expect(screen.getByText("75%")).toBeInTheDocument();
        });

        it("displays label when provided", () => {
            render(<ProgressBar value={50} label="Win Rate" />);
            expect(screen.getByText("Win Rate")).toBeInTheDocument();
        });

        it("caps percentage at 100%", () => {
            render(<ProgressBar value={150} max={100} />);
            expect(screen.getByText("100%")).toBeInTheDocument();
        });

        it("handles zero values", () => {
            render(<ProgressBar value={0} />);
            expect(screen.getByText("0%")).toBeInTheDocument();
        });

        it("hides percentage when showPercentage is false", () => {
            render(<ProgressBar value={50} showPercentage={false} />);
            expect(screen.queryByText("50%")).not.toBeInTheDocument();
        });
    });

    // ===== STAT MINI CARD =====
    describe("StatMiniCard", () => {
        it("renders icon, label and value", () => {
            render(<StatMiniCard icon="📊" label="Total" value={42} />);
            expect(screen.getByText("📊")).toBeInTheDocument();
            expect(screen.getByText("Total")).toBeInTheDocument();
            expect(screen.getByText("42")).toBeInTheDocument();
        });

        it("renders change indicator when provided", () => {
            render(
                <StatMiniCard icon="📊" label="Test" value={10} change="+5%" changeType="up" />
            );
            expect(screen.getByText("+5%")).toBeInTheDocument();
        });

        it("applies correct change color for 'up'", () => {
            render(
                <StatMiniCard icon="📊" label="Test" value={10} change="+5%" changeType="up" />
            );
            const change = screen.getByText("+5%");
            expect(change.className).toContain("text-emerald-400");
        });

        it("applies correct change color for 'down'", () => {
            render(
                <StatMiniCard icon="📊" label="Test" value={10} change="-3%" changeType="down" />
            );
            const change = screen.getByText("-3%");
            expect(change.className).toContain("text-red-400");
        });

        it("renders string values", () => {
            render(<StatMiniCard icon="⚡" label="Status" value="Active" />);
            expect(screen.getByText("Active")).toBeInTheDocument();
        });
    });
});
