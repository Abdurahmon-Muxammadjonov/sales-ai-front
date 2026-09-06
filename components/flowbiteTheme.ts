import { createTheme } from "flowbite-react";

/**
 * Flowbite ships a blue-and-grey theme of its own. This maps every surface it
 * paints onto the product's tokens, so a modal, a dropdown and a hand-written
 * bordered row are the same white, the same hairline and the same radius — in
 * both colour schemes.
 */
export const flowbiteTheme = createTheme({
  textInput: {
    field: {
      input: {
        base: "block w-full rounded-control border focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        sizes: {
          sm: "h-8 px-2.5 text-sm",
          md: "h-10 px-3 text-base",
          lg: "h-12 px-4 text-lg",
        },
        colors: {
          gray: "border-line bg-canvas text-ink placeholder:text-ink-3 focus:border-ink",
        },
        withAddon: { on: "rounded-e-control", off: "rounded-control" },
        withShadow: { on: "", off: "" },
      },
    },
  },

  select: {
    field: {
      select: {
        base: "block w-full rounded-control border pr-8 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        sizes: {
          sm: "h-9 px-2.5 text-sm",
          md: "h-10 px-3 text-base",
          lg: "h-12 px-4 text-lg",
        },
        colors: {
          gray: "border-line bg-canvas text-ink focus:border-ink",
        },
        withAddon: { on: "rounded-e-control", off: "rounded-control" },
        withShadow: { on: "", off: "" },
      },
    },
  },

  label: {
    root: {
      base: "text-sm font-normal",
      colors: { default: "text-ink-2" },
    },
  },

  checkbox: {
    base: "size-4 rounded border border-line bg-canvas focus:ring-0 focus:ring-offset-0",
    color: { default: "text-ink" },
  },

  toggleSwitch: {
    root: {
      base: "group flex rounded-control focus:outline-none",
      label: "ms-3 mt-0.5 text-start text-sm font-medium text-ink",
    },
    toggle: {
      base: "relative rounded-full after:absolute after:rounded-full after:border after:bg-white after:transition-all",
      checked: {
        on: "after:translate-x-full after:border-transparent rtl:after:-translate-x-full",
        off: "bg-line after:border-line",
        color: { default: "bg-ink" },
      },
    },
  },

  modal: {
    root: {
      show: { on: "flex bg-black/40 dark:bg-black/70", off: "hidden" },
    },
    content: {
      inner:
        "relative flex max-h-[90dvh] flex-col rounded-card border border-line bg-canvas shadow-xl",
    },
    header: {
      base: "flex items-start justify-between rounded-t border-b border-line p-5",
      title: "font-display text-lg font-semibold tracking-tight text-ink",
      close: {
        base: "ms-auto inline-flex items-center rounded-control bg-transparent p-1.5 text-sm text-ink-3 hover:bg-raised hover:text-ink",
        icon: "h-5 w-5",
      },
    },
    body: { base: "flex-1 overflow-auto p-5" },
    footer: { base: "flex items-center gap-2 rounded-b border-t border-line p-5" },
  },

  dropdown: {
    floating: {
      base: "z-10 w-fit rounded-card shadow-xl focus:outline-none",
      content: "py-1 text-sm text-ink",
      divider: "my-1 h-px bg-line",
      header: "block px-4 py-2 text-sm text-ink-2",
      item: {
        base: "flex w-full cursor-pointer items-center justify-start px-4 py-2 text-sm text-ink-2 hover:bg-raised hover:text-ink focus:bg-raised focus:text-ink focus:outline-none",
      },
      style: {
        auto: "border border-line bg-canvas text-ink",
        light: "border border-line bg-canvas text-ink",
      },
    },
  },

  drawer: {
    root: {
      base: "fixed z-40 overflow-y-auto border-line bg-canvas p-4 transition-transform",
      backdrop: "fixed inset-0 z-30 bg-black/40 dark:bg-black/70",
    },
    header: {
      inner: {
        titleText: "mb-4 inline-flex items-center text-base font-semibold text-ink",
        closeButton:
          "absolute end-2.5 top-2.5 flex size-8 items-center justify-center rounded-control bg-transparent text-sm text-ink-3 hover:bg-raised hover:text-ink",
      },
    },
  },

  // Flowbite's table ships grey fills, rounded corners and uppercase headers.
  // Stripped back to the same hairline grid every other list in the app uses.
  table: {
    root: { base: "w-full text-left text-sm", wrapper: "relative overflow-x-auto" },
    head: {
      base: "group/head text-xs normal-case",
      cell: {
        base: "rounded-none border-b border-line bg-canvas px-3 py-2.5 font-medium text-ink-3 first:pl-1 last:pr-1",
      },
    },
    body: { cell: { base: "rounded-none px-3 py-3.5 first:pl-1 last:pr-1" } },
    row: { base: "group/row border-b border-line", hovered: "hover:bg-raised" },
  },

  badge: {
    root: {
      base: "flex h-fit items-center gap-1 font-medium",
      color: { gray: "border border-line bg-raised text-ink-2" },
      size: { xs: "px-2 py-0.5 text-xs", sm: "px-2.5 py-1 text-sm" },
    },
  },

  avatar: {
    root: {
      initials: {
        text: "text-xs font-medium text-ink-2",
        base: "relative inline-flex items-center justify-center overflow-hidden bg-raised",
      },
    },
  },

  spinner: {
    color: { info: "fill-ink" },
    base: "inline animate-spin text-line",
  },
});

type ClearMap = { [key: string]: true | ClearMap };

/**
 * Mirrors `flowbiteTheme` with `true` at every leaf. Handing this to the
 * provider as `clearTheme` drops Flowbite's own string for each key we replace
 * instead of merging with it — otherwise its `dark:bg-gray-700` survives
 * alongside our `bg-canvas`, because tailwind-merge sees no conflict between a
 * variant and a bare utility.
 */
function toClearMap(value: object): ClearMap {
  const result: ClearMap = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] =
      child !== null && typeof child === "object" ? toClearMap(child as object) : true;
  }
  return result;
}

export const flowbiteClearTheme = toClearMap(flowbiteTheme) as Record<string, unknown>;
