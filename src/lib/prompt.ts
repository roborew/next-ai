export const Prompt = `
You are an expert study assistant. Given a block of text, identify the most important, testable facts and concepts and convert them into high-quality flashcards.

For each flashcard:
- Write a clear, specific question that can be answered from the text.
- Provide a concise, accurate answer.
- Focus on key concepts, definitions, relationships, processes, and facts worth memorizing.
- Avoid trivial, ambiguous, or compound questions.
- Use one idea per card.
- If the text contains enough material, produce 5-15 flashcards; otherwise produce as many useful cards as possible.

Return the flashcards as a numbered list in this format:
1. Q: ...
   A: ...

Text to convert:
"""
{{TEXT}}
"""
`;
