import { ImagePromptForm } from "./_components/ImagePromptForm";

const DEFAULT_PROMPT = "A turquoise hummingbird resting on a dew-covered branch at sunrise.";

export default function Page() {
  return (
    <>
      <ImagePromptForm defaultPrompt={DEFAULT_PROMPT} />
    </>
  );
}
