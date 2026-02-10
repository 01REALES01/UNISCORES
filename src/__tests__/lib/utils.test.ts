import { cn } from "@/lib/utils";

describe("cn (className merger)", () => {
    it("merges multiple class strings", () => {
        const result = cn("foo", "bar");
        expect(result).toContain("foo");
        expect(result).toContain("bar");
    });

    it("handles undefined and null values", () => {
        const result = cn("foo", undefined, null, "bar");
        expect(result).toContain("foo");
        expect(result).toContain("bar");
        expect(result).not.toContain("undefined");
        expect(result).not.toContain("null");
    });

    it("handles conditional classes", () => {
        const isActive = true;
        const result = cn("base", isActive && "active");
        expect(result).toContain("active");
    });

    it("handles false conditional classes", () => {
        const isActive = false;
        const result = cn("base", isActive && "active");
        expect(result).toContain("base");
        expect(result).not.toContain("active");
    });

    it("merges tailwind classes correctly (last wins)", () => {
        const result = cn("p-2", "p-4");
        expect(result).toContain("p-4");
    });

    it("returns empty string for no arguments", () => {
        const result = cn();
        expect(result).toBe("");
    });
});
