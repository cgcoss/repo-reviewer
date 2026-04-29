import { useEffect } from "react";
import { EventsOn, EventsOff } from "../../wailsjs/runtime/runtime";

export function useGitWatcher(onChange: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;

        const unsubscribe = EventsOn("git:status-changed", onChange);

        return () => {
            unsubscribe();
            EventsOff("git:status-changed");
        };
    }, [onChange, enabled]);
}
