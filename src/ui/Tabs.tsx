import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Tabs.module.css';

type Tab = { id: string; label: string; panel: ReactNode };

type TabsProps = {
  tabs: Tab[];
  /** Accessible name of the tab list. */
  label: string;
  defaultTabId?: string | undefined;
};

/** WAI-ARIA tabs with automatic activation: arrows, Home and End move and select. */
export function Tabs({ tabs, label, defaultTabId }: TabsProps) {
  const [selectedId, setSelectedId] = useState(defaultTabId ?? tabs[0]?.id);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const baseId = useId();

  function select(index: number) {
    const tab = tabs.at(index % tabs.length);
    if (!tab) return;
    setSelectedId(tab.id);
    tabRefs.current.get(tab.id)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: -1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className={styles.tablist}>
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedId;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) tabRefs.current.set(tab.id, node);
                return () => {
                  tabRefs.current.delete(tab.id);
                };
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => setSelectedId(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        // Hidden rather than unmounted: switching tabs keeps what was typed.
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== selectedId}
          className={styles.panel}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
