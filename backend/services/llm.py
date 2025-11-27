"""
LLM Service using LiteLLM for unified interface
Supports Ollama, OpenAI, Anthropic, Google Gemini, and more
"""

import litellm
from typing import List, Dict, Any, Optional
import json
from config import config

# Configure LiteLLM
litellm.set_verbose = config.DEBUG
import requests

# Set API keys if provided
if config.OPENAI_API_KEY:
    litellm.openai_key = config.OPENAI_API_KEY
if config.ANTHROPIC_API_KEY:
    litellm.anthropic_key = config.ANTHROPIC_API_KEY
if config.GEMINI_API_KEY:
    litellm.gemini_key = config.GEMINI_API_KEY

# Configure Ollama base URL
if config.OLLAMA_BASE_URL:
    litellm.api_base = config.OLLAMA_BASE_URL


class LLMService:
    """Service for interacting with various LLM providers"""
    
    @staticmethod
    def _ensure_model_prefix(model: str) -> str:
        """Helper to ensure model has correct prefix"""
        if model and "/" not in model and not model.startswith(("gpt-", "claude-", "gemini-")):
            return f"ollama/{model}"
        return model

    @staticmethod
    async def chat_completion(
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None
    ) -> str:
        """
        Generic chat completion
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier (e.g., 'ollama/llama3.2', 'gpt-4o-mini')
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            response_format: 'json' for JSON mode, None for text
            
        Returns:
            Generated text content
        """
        model = model or config.DEFAULT_LLM_MODEL
        
        # Auto-prefix ollama if not specified
        if model and "/" not in model and not model.startswith(("gpt-", "claude-", "gemini-")):
            model = f"ollama/{model}"
            
        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
            
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}
        
        try:
            response = litellm.completion(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"LLM completion failed: {str(e)}")
    
    @staticmethod
    async def generate_story(
        topic: str,
        level: str,
        length: str,
        theme: str = "",
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, str]:
        """Generate a language learning story"""
        
        length_map = {
            "Short": "approx 100 words",
            "Medium": "approx 250 words",
            "Long": "approx 500 words"
        }
        
        system_prompt = f"""You are a {target_language} language teacher.
Write a {target_language} story about "{topic}"{f' with a theme of "{theme}"' if theme else ''} for a learner at {level} level.
Length: {length_map.get(length, 'approx 200 words')}.

IMPORTANT: Return ONLY valid JSON with the following structure:
{{
  "title": "The Title",
  "content": "The story text..."
}}
Do not include markdown formatting (like ```json) in the response. Just the raw JSON string."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Generate the story now."}
        ]
        
        response = await LLMService.chat_completion(
            messages=messages,
            model=model,
            temperature=0.7
            # response_format="json" # Removed to avoid litellm/ollama issues
        )
        
        # Clean up response
        response = response.replace("```json", "").replace("```", "").strip()
        
        # Remove <think> tags if present
        if "<think>" in response:
            import re
            response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()
            
        # Sanitize control characters that might break JSON parsing
        # Replace unescaped newlines within strings if possible, or just rely on strict=False
        # A simple way to handle newlines in JSON values is to rely on the LLM to escape them, 
        # but sometimes they don't.
        
        try:
            return json.loads(response, strict=False)
        except json.JSONDecodeError:
            # Fallback: Try to escape newlines that might be causing issues
            # This is a naive fix but often works for simple LLM outputs
            try:
                import re
                # Attempt to fix unescaped newlines inside quotes? 
                # Actually, let's just try to parse it again with a more lenient approach if available
                # or just log the error and return a partial object
                print(f"JSON Parse Error. Raw response: {response}")
                raise
            except Exception:
                raise
    
    @staticmethod
    async def simplify_text(
        text: str,
        level: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> str:
        """Simplify text to a target CEFR level"""
        
        system_prompt = f"""You are a {target_language} language teacher.
Rewrite the following text to be suitable for a learner at the {level} level.
Keep the meaning of the story but use simpler vocabulary and grammar.
IMPORTANT: Return ONLY the simplified text. Do not include any intro or outro."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        return await LLMService.chat_completion(
            messages=messages,
            model=model,
            temperature=0.3
        )
    
    @staticmethod
    async def generate_comprehension_questions(
        text: str,
        count: int = 3,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> List[Dict[str, str]]:
        """Generate comprehension questions for a text"""
        
        system_prompt = f"""You are a {target_language} language teacher.
Read the provided text and generate {count} comprehension questions in {target_language} with their answers.
Return ONLY a valid JSON array of objects. Each object must have a "q" field (question) and an "a" field (answer).
Do not include any markdown formatting like ```json or ```. Just the raw JSON array.
Example output format:
[
  {{"q": "Question in {target_language}?", "a": "Answer in {target_language}."}},
  {{"q": "Question in {target_language}?", "a": "Answer in {target_language}."}}
]"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f'Text:\n"{text}"'}
        ]
        
        response = await LLMService.chat_completion(
            messages=messages,
            model=model,
            temperature=0.7,
            response_format="json"
        )
        
        # Clean and parse
        response = response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(response)
        
        # Normalize output
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, dict) and "questions" in parsed:
            return parsed["questions"]
        else:
            raise ValueError("Unexpected response format")
    
    @staticmethod
    async def explain_text(
        text: str,
        template: str,
        context: str = "",
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, Any]:
        """Explain text (grammar, sentence, or word)"""
        
        prompts = {
            "grammar": f"""You are a {target_language} language teacher. Analyze the grammar in this {target_language} text:
"{text}"
{f'Context: "{context}"' if context else ''}

Explain the grammatical structures in a clear, educational way.

Return ONLY valid JSON with this structure:
{{
  "summary": "Brief overview of main grammatical points (1-2 sentences)",
  "structures": [
    {{
      "element": "grammatical element (e.g., 'den Mann')",
      "explanation": "what it is and why (e.g., 'Accusative case - direct object')"
    }}
  ],
  "tips": ["Helpful tip 1", "Helpful tip 2"]
}}
Do not include markdown formatting. Just the raw JSON string.""",
            
            "sentence": f"""You are a {target_language} language teacher. Explain this {target_language} sentence to a learner:
"{text}"
{f'Context: "{context}"' if context else ''}

Provide translation and breakdown.

Return ONLY valid JSON with this structure:
{{
  "translation": "English translation of the sentence",
  "breakdown": [
    {{
      "part": "word or phrase from the sentence",
      "meaning": "its meaning/function in this context"
    }}
  ],
  "notes": "Any important notes about usage, idioms, or nuances"
}}
Do not include markdown formatting. Just the raw JSON string.""",
            
            "word": f"""You are a {target_language} language teacher. Explain this {target_language} word or phrase:
"{text}"
{f'In context: "{context}"' if context else ''}

Provide detailed explanation for a language learner.

Return ONLY valid JSON with this structure:
{{
  "translation": "English translation",
  "explanation": "Detailed explanation of meaning and usage",
  "examples": [
    {{"german": "Example sentence 1", "english": "Translation 1"}},
    {{"german": "Example sentence 2", "english": "Translation 2"}}
  ],
  "tips": "Learning tips or common mistakes to avoid"
}}
Do not include markdown formatting. Just the raw JSON string."""
        }
        
        prompt = prompts.get(template, prompts["sentence"])
        
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": "Explain now."}
        ]
        
        response = await LLMService.chat_completion(
            messages=messages,
            model=model,
            temperature=0.5,
            response_format="json"
        )
        
        # Clean and parse
        response = response.replace("```json", "").replace("```", "").strip()
        return json.loads(response)
    
    @staticmethod
    async def analyze_writing(
        text: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, Any]:
        """Analyze and correct writing"""
        
        system_prompt = f"""You are a {target_language} language teacher correcting a student's writing.
Analyze the provided {target_language} text.
Return ONLY a valid JSON object with the following structure:
{{
  "correctedText": "The full text with all grammar and spelling errors fixed.",
  "feedback": "A brief overall comment on the writing style and level.",
  "rating": "A CEFR level estimate (e.g., A1, A2, B1...)",
  "corrections": [
    {{
      "original": "mistaken phrase",
      "correction": "corrected phrase",
      "explanation": "Why it was wrong"
    }}
  ],
  "suggestions": [
    "Suggestion for better vocabulary or phrasing 1",
    "Suggestion 2"
  ]
}}
Do not include markdown formatting like ```json. Just the raw JSON object."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        response = await LLMService.chat_completion(
            messages=messages,
            model=model,
            temperature=0.3,
            response_format="json"
        )
        
        # Clean and parse
        response = response.replace("```json", "").replace("```", "").strip()
        return json.loads(response)
    
    @staticmethod
    async def detect_level(
        text: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, str]:
        """Detect CEFR level of text"""
        
        system_prompt = f"""You are an expert {target_language} language teacher.
Analyze the provided text and determine its CEFR proficiency level (A1, A2, B1, B2, C1, or C2).

IMPORTANT: Return ONLY a valid JSON object with EXACTLY these two fields:
- "level": The CEFR level (e.g., "A2").
- "reasoning": A brief explanation of why this level was chosen.

Example:
{{
  "level": "B1",
  "reasoning": "Uses complex sentence structures and vocabulary related to daily life."
}}
Do not include markdown formatting like ```json. Just the raw JSON object."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text[:1000]}  # First 1000 chars
        ]
        
        response = await LLMService.chat_completion(
            messages=messages,
            model=model,
            temperature=0.3,
            response_format="json"
        )
        
        # Clean and parse
        response = response.replace("```json", "").replace("```", "").strip()
        return json.loads(response)
    
    @staticmethod
    async def adapt_content(
        text: str,
        level: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, str]:
        """Adapt and expand content to target level"""
        
        system_prompt = f"""You are an expert {target_language} language teacher and editor.
Your task is to adapt the provided text for a learner at the {level} level.

The input text might be a short summary. Your goal is to EXPAND it into a full, engaging article (approx. 300-500 words).

RULES:
1. **Language**: The output MUST be in {target_language}.
2. **Content**: 
   - Expand the provided summary into a complete story/article.
   - Use the summary as the core facts but elaborate on context, background, and details to make it a full narrative.
   - Maintain the original meaning but make it longer and more engaging.
   - IGNORE all metadata, copyright notices, headers, footers.
3. **Difficulty**: Adapt the vocabulary and grammar strictly to CEFR level {level}.
4. **Output Format**: You MUST return a valid JSON object with EXACTLY these two fields:
   - "reasoning": A brief explanation (in English) of what you changed.
   - "adapted_text": The final adapted {target_language} text (should be 300-500 words).

Example JSON:
{{
  "reasoning": "Expanded the summary into a full article and simplified vocabulary for A2 level.",
  "adapted_text": "Full expanded text in {target_language}..."
}}
Do not include markdown formatting like ```json. Just the raw JSON object."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        response = await LLMService.chat_completion(
            messages=messages,
            model=model,
            temperature=0.3,
            response_format="json"
        )
        
        # Clean and parse
        response = response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(response)
        
        return {
            "content": parsed.get("adapted_text", parsed.get("content", parsed.get("text", response))),
            "reasoning": parsed.get("reasoning", "No reasoning provided.")
        }
    
    @staticmethod
    async def chat_response(
        messages: List[Dict[str, str]],
        scenario: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> str:
        """Generate chat response for roleplay"""
        
        system_prompt = f"""You are a helpful {target_language} tutor role-playing as a character in a "{scenario}" scenario.
Your goal is to help the user practice {target_language} conversation.
Keep your responses natural, relatively short (1-3 sentences), and suitable for a learner.
If the user makes a mistake, you can subtly correct them in your response or just continue the conversation naturally if it's understandable.
Do NOT break character."""
        
        conversation = [
            {"role": "system", "content": system_prompt},
            *messages
        ]
        
        return await LLMService.chat_completion(
            messages=conversation,
            model=model,
            temperature=0.8
        )
    
    @staticmethod
    async def generate_hints(
        messages: List[Dict[str, str]],
        scenario: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> List[str]:
        """Generate conversation hints"""
        
        system_prompt = f"""You are a {target_language} language helper. The user is in a role-play scenario: "{scenario}".
The user is stuck and needs a hint on what to say next.
Read the conversation history and suggest 3 possible {target_language} responses the user could say.
Return ONLY a valid JSON array of strings.
Example: ["Response 1", "Response 2", "Response 3"]"""
        
        conversation = [
            {"role": "system", "content": system_prompt},
            *messages,
            {"role": "user", "content": "I don't know what to say. Give me a hint."}
        ]
        
        response = await LLMService.chat_completion(
            messages=conversation,
            model=model,
            temperature=0.7,
            response_format="json"
        )
        
        # Clean and parse
        response = response.replace("```json", "").replace("```", "").strip()
        hints = json.loads(response)
        
        return hints if isinstance(hints, list) else ["Entschuldigung?", "Ich verstehe nicht.", "Können Sie das wiederholen?"]

    @staticmethod
    async def get_available_models() -> List[Dict[str, Any]]:
        """Get available LLM models"""
        models = []
        
        # 1. Try to fetch from Ollama if configured
        if config.OLLAMA_BASE_URL:
            try:
                response = requests.get(f"{config.OLLAMA_BASE_URL}/api/tags", timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    for model in data.get("models", []):
                        models.append({
                            "name": model["name"],
                            "provider": "ollama",
                            "details": model
                        })
            except Exception as e:
                print(f"Failed to fetch Ollama models: {e}")
        
        # 2. Add cloud models if keys are present
        if config.OPENAI_API_KEY:
            models.append({"name": "gpt-4o-mini", "provider": "openai"})
            models.append({"name": "gpt-4o", "provider": "openai"})
            
        if config.ANTHROPIC_API_KEY:
            models.append({"name": "claude-3-haiku-20240307", "provider": "anthropic"})
            models.append({"name": "claude-3-5-sonnet-20240620", "provider": "anthropic"})
            
        if config.GEMINI_API_KEY:
            models.append({"name": "gemini/gemini-1.5-flash", "provider": "google"})
            models.append({"name": "gemini/gemini-1.5-pro", "provider": "google"})
            
        # 3. Fallback if empty
        if not models:
            models.append({"name": config.DEFAULT_LLM_MODEL, "provider": "unknown"})
            
        return models

    @staticmethod
    async def generate_concept_card(
        topic: str,
        level: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, Any]:
        """
        Generate a grammar concept card
        """
        system_prompt = f"""
You are an expert {target_language} teacher. Create a "Concept Card" for the grammar topic: "{topic}" (Level {level}).

Return ONLY valid JSON with this structure:
{{
  "meta": {{
    "topic": "{topic}",
    "level": "{level}"
  }},
  "overview": "2-3 simple sentences explaining the concept",
  "form": {{
    "type": "table",
    "headers": ["Header 1", "Header 2"],
    "rows": [["Row 1 Col 1", "Row 1 Col 2"]]
  }},
  "usage": ["Bullet point 1", "Bullet point 2"],
  "examples": [
    {{ "german": "Example sentence", "english": "Translation", "note": "Explanation" }}
  ],
  "common_mistakes": [
    {{ "mistake": "Wrong sentence", "correction": "Correct sentence", "explanation": "Why it was wrong" }}
  ],
  "mini_quiz": [
    {{ "question": "Quiz question?", "options": ["Option A", "Option B"], "correct": 0 }}
  ]
}}
Do not include markdown formatting like ```json. Just the raw JSON object.
"""

        try:
            response = await LLMService.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate the concept card."}
                ],
                model=model
                # response_format="json" # Removed to avoid litellm/ollama issues
            )
            
            # Clean up response
            content = response.replace("```json", "").replace("```", "").strip()
            
            # Remove <think> tags if present
            if "<think>" in content:
                import re
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                
            return json.loads(content)
            
        except Exception as e:
            print(f"Error generating concept card: {e}")
            raise e

    @staticmethod
    async def generate_exercises(
        topic: str,
        level: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, Any]:
        """
        Generate grammar exercises
        """
        system_prompt = f"""
You are an expert {target_language} teacher. Create 5 exercises for the grammar topic: "{topic}" (Level {level}).
Include a mix of: Multiple Choice, Gap Fill, and Sentence Reordering.

Return ONLY valid JSON with this structure:
{{
  "exercises": [
    {{
      "type": "multiple_choice",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C"],
      "correct": 0,
      "explanation": "Why this is correct"
    }},
    {{
      "type": "gap_fill",
      "question": "Sentence with ___ (hint).",
      "answer": "missing_word",
      "hint": "Grammar hint"
    }},
    {{
      "type": "reorder",
      "segments": ["Word1", "Word2", "Word3"],
      "correct_order": [0, 1, 2]
    }}
  ]
}}
Do not include markdown formatting like ```json. Just the raw JSON object.
"""

        try:
            response = await LLMService.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate the exercises."}
                ],
                model=model
            )
            
            # Clean up response
            content = response.replace("```json", "").replace("```", "").strip()
            
            # Remove <think> tags if present
            if "<think>" in content:
                import re
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()

            print(f"Raw response: {content}")
            return json.loads(content)
            
        except Exception as e:
            print(f"Error generating exercises: {e}")
            raise e

    @staticmethod
    async def generate_context_card(
        topic: str,
        level: str,
        model: Optional[str] = None,
        target_language: str = "German"
    ) -> Dict[str, Any]:
        """
        Generate a context card (story with grammar spotting)
        """
        system_prompt = f"""
You are an expert {target_language} teacher. Write a short story (approx 100-150 words) that heavily features the grammar topic: "{topic}" (Level {level}).
Also provide a glossary and a list of phrases where the grammar rule is applied.

Return ONLY valid JSON with this structure:
{{
  "title": "Story Title",
  "text": "Full story text...",
  "glossary": [
    {{ "word": "German Word", "definition": "English Definition" }}
  ],
  "grammar_spotting": [
    {{ "phrase": "phrase from text", "rule": "Brief explanation of why this rule applies here" }}
  ]
}}
Do not include markdown formatting like ```json. Just the raw JSON object.
"""

        try:
            model = model or config.DEFAULT_LLM_MODEL
            
            # Auto-prefix ollama if not specified
            if model and "/" not in model and not model.startswith(("gpt-", "claude-", "gemini-")):
                model = f"ollama/{model}"
                
            response = await LLMService.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate the context card."}
                ],
                model=model
            )
            
            # Clean up response
            content = response.replace("```json", "").replace("```", "").strip()
            
            # Remove <think> tags if present
            if "<think>" in content:
                import re
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                
            print(f"Raw response: {content}")
            return json.loads(content)
            
        except Exception as e:
            print(f"Error generating context card: {e}")
            raise e

    @staticmethod
    async def generate_curriculum(level: str, model: str = None) -> dict:
        """
        Generates a list of grammar topics for a specific CEFR level.
        Returns a dictionary with a list of topics.
        """
        model = model or config.DEFAULT_LLM_MODEL
        model = LLMService._ensure_model_prefix(model)
        
        system_prompt = f"""
You are an expert German language curriculum designer.
List the most important grammar topics for CEFR Level {level}.

Return ONLY a JSON object with this exact structure:
{{
  "level": "{level}",
  "topics": [
    {{
      "title": "Topic Title (e.g. Present Tense Verbs)",
      "topic": "technical_topic_id (e.g. verbConjugation)",
      "description": "Brief description of what is covered"
    }}
  ]
}}

Guidelines:
- Include 10-15 key topics for this level.
- "topic" field should be one of: articles, verbConjugation, pronouns, prepositions, adjectiveDeclension, wordOrder, cases, syntax, culture, vocabulary.
- Be concise.
"""
        
        try:
            response = await LLMService.chat_completion(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate the grammar curriculum for {level}."}
                ],
                temperature=0.7
            )
            
            response = await LLMService.chat_completion(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate the grammar curriculum for {level}."}
                ],
                temperature=0.7
            )
            
            content = response
            # Clean up potential markdown formatting
            content = content.replace("```json", "").replace("```", "").strip()
            
            # Handle <think> tags if present
            import re
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
            
            return json.loads(content)
            
        except Exception as e:
            print(f"Error generating curriculum for {level}: {e}")
            return {"level": level, "topics": []}


