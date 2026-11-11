import { log } from './log';

// Copies the text to the clipboard. Returns false when the browser does not allow it (the screen then shows the text to copy by hand).
export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    log.warn('Could not copy to the clipboard', error);
    return false;
  }
};
