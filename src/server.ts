import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  Diagnostic,
  DiagnosticSeverity,
//   Hover,
  TextDocumentPositionParams,
  CompletionItem,
  CompletionItemKind,
  SemanticTokensParams,
  SemanticTokensBuilder,
  InitializeResult,
  DidChangeConfigurationNotification,
  SemanticTokensLegend,
  SemanticTokens,
  Position,
  InsertTextFormat
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;



connection.onInitialize((_params: InitializeParams) => {
    connection.console.log('ATRC Language Server initialized');
    let capabilities = _params.capabilities; 

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );
    const resVal: InitializeResult = {
        capabilities: {
            semanticTokensProvider: {
                legend,
                full: true,
                range: false
            },
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // hoverProvider: true,
            completionProvider: {
                resolveProvider: true,
                allCommitCharacters: ['#', '.', '%', '<', '[', "E", "N", "G", "L", "G", "O", "T", "F", "W", "M", "U", "X", "A"],
                triggerCharacters: ['#', '.', '%', '<', '[', "E", "N", "G", "L", "G", "O", "T", "F", "W", "M", "U", "X", "A"]
            },
        }
    };
    if (hasWorkspaceFolderCapability) {
        resVal.capabilities.workspace = {
        workspaceFolders: {
            supported: true
        }
        };
    }

    return resVal;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

interface InnerCompletionItem {
    match: RegExp;
    label: string;
    detail: string;
    kind: CompletionItemKind;
}

// Completion items for preprocessors
const preprocessors: InnerCompletionItem[] = [
    { match: RegExp("\\s*#\\.(ELSEIF)\\b"), label: '#.IF', detail: 'Conditional IF directive', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(ELSE)\\b"), label: '#.ELSE', detail: 'Conditional ELSE directive', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(ELSEIF)\\b"), label: '#.ELSEIF', detail: 'Conditional ELSEIF directive', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(ENDIF)\\b"), label: '#.ENDIF', detail: 'End IF block', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(IGNORE)\\b"), label: '#.IGNORE', detail: 'Ignore next N lines', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(INCLUDE)\\b"), label: '#.INCLUDE', detail: 'Include another file', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(SR)\\b"), label: '#.SR', detail: 'Start Rawstring region', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(ER)\\b"), label: '#.ER', detail: 'End Rawstring region', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(LOG)\\b"), label: '#.LOG', detail: 'Log message', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(ERRORCOUT)\\b"), label: '#.ERRORCOUT', detail: 'Error output message', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(ERROR)\\b"), label: '#.ERRORCOUT', detail: 'Error output message', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(SUCCESS)\\b"), label: '#.SUCCESS', detail: 'Success message', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(DEBUG)\\b"), label: '#.DEBUG', detail: 'Debug message', kind: CompletionItemKind.Keyword },
    { match: RegExp("\\s*#\\.(WARNING)\\b"), label: '#.WARNING', detail: 'Warning message', kind: CompletionItemKind.Keyword }
];


const preprocessorOperators: InnerCompletionItem[] = [
    { match: RegExp("\\b(EQU)\\b"), label: 'EQU', detail: "Equals to", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(NEQ)\\b"), label: 'NEQ', detail: "Not equals to", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(GT)\\b"), label: 'GT', detail: "Greater than", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(LT)\\b"), label: 'LT', detail: "Less than", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(GTE)\\b"), label: 'GTE', detail: "Greater than or equal to", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(LTE)\\b"), label: 'LTE', detail: "Less than or equal to", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(ANDT)\\b"), label: 'AND', detail: "Logical AND", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(OR)\\b"), label: 'OR', detail: "Logical OR", kind: CompletionItemKind.Operator },
    { match: RegExp("\\b(NOT)\\b"), label: 'NOT', detail: "Logical NOT", kind: CompletionItemKind.Operator },
]



const preprocessorKeywords: InnerCompletionItem[] = [
    { match: RegExp("\\b(TRUE)\\b"), label: 'TRUE', detail: "Boolean true", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(FALSE)\\b"), label: 'FALSE', detail: "Boolean false", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(LINUX)\\b"), label: 'LINUX', detail: "Linux operating system", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(WINDOWS)\\b"), label: 'WINDOWS', detail: "Windows operating system", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(MACOS)\\b"), label: 'MACOS', detail: "macOS operating system", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(UNIX)\\b"), label: 'UNIX', detail: "Unix-like operating system", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(X86)\\b"), label: 'X86', detail: "x86 architecture", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(X64)\\b"), label: 'X64', detail: "x64 architecture", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(ARM)\\b"), label: 'ARM', detail: "ARM architecture", kind: CompletionItemKind.Constant },
    { match: RegExp("\\b(ARM64)\\b"), label: 'ARM64', detail: "ARM64 architecture", kind: CompletionItemKind.Constant },
    { match: RegExp("\"[^\"]*\"|'[^']*'"), label: 'String literal', detail: "String value", kind: CompletionItemKind.Value },
    { match: RegExp("%[A-Za-z0-9_]+%"), label: 'Global variable', detail: "Global variable injection", kind: CompletionItemKind.Variable },
]



const ShebangPattern: InnerCompletionItem = { match: RegExp("^#!ATRC\\b"), label: "#!ATRC", detail: "Shebang", kind: CompletionItemKind.Keyword };

const CommentPattern: InnerCompletionItem = { match: RegExp("^\\s*#.*$"), label: "#", detail: "Comment", kind: CompletionItemKind.Property };

const ValuePatterns: InnerCompletionItem[] = [
    { label: "<value>", match: RegExp("\\b[A-Za-z_][A-Za-z0-9_]*\\b", "g"), detail: "Unquoted value", kind: CompletionItemKind.Value },
]

const blockPatterns: InnerCompletionItem[] = [
    { label: "[<block>]", match: RegExp("^\\s*\\[([A-Za-z0-9_]+)\\]", "g"), detail: "Block definition", kind: CompletionItemKind.Struct },
];

const VariablePatterns: InnerCompletionItem[] = [
    { label: "%<var>%=", match: RegExp("(\\%)([A-Za-z0-9_]+)(\\%)\\s*=\\s*", "g"), detail: "Public variable definition", kind: CompletionItemKind.Variable },
    { label: "<%<var>%=", match: RegExp("(<\\%)([A-Za-z0-9_]+)(\\%)\\s*=\\s*", "g"), detail: "Private variable definition", kind: CompletionItemKind.Variable },
]

const InjectionPatterns: InnerCompletionItem[] = [
    { label: "%*N*", match: RegExp("%\\*\\d+%", "g"), detail: "Numeral variable injection definition", kind: CompletionItemKind.Variable },
    { label: "%*%", match: RegExp("%\\*%", "g"), detail: "Variable injection definition", kind: CompletionItemKind.Variable },
    { label: "%<var>%", match: RegExp("%[A-Za-z0-9_]+%", "g"), detail: "Global variable injection definition", kind: CompletionItemKind.Variable },
];

const KeyPatterns: InnerCompletionItem[] = [
    { label: "key=", match: RegExp("\\b([A-Za-z_][A-Za-z0-9_]*)\\b(?=\\s*=)", "g"), detail: "Key definition", kind: CompletionItemKind.Field }
];

const preprocessorKeywordCompletions: CompletionItem[] = preprocessorKeywords.map(item => ({
    label: item.label,
    kind: item.kind,
    detail: item.detail,
    insertText: item.label,
    filterText: item.label, // Use label as filter text
    preselect: true, // Preselect the operator in the completion list
    insertTextFormat: InsertTextFormat.PlainText
}));
const preprocessorCompletions: CompletionItem[] = preprocessors.map(item => ({
    label: item.label,                      // e.g., '#.IF'
    kind: item.kind,
    detail: item.detail,
    insertText: item.label.replace(/^\s*/, ''), // Avoid leading spaces
    filterText: item.label.replace(/^\s*#\./, ''), // e.g., match 'IF' instead of '#.IF'
    sortText: item.label,                  // Optional: keeps original order
    insertTextFormat: InsertTextFormat.PlainText
}));

const preprocessorOperatorCompletions: CompletionItem[] = preprocessorOperators.map(item => ({
    label: item.label,
    kind: item.kind,
    detail: item.detail,
    insertText: item.label,
    filterText: item.label, // Use label as filter text
    preselect: true, // Preselect the operator in the completion list
    insertTextFormat: InsertTextFormat.PlainText
}));

const combinedCompletions: CompletionItem[] = [
    ...preprocessorKeywordCompletions,
    ...preprocessorOperatorCompletions,
    ...preprocessorCompletions,
];

// const allHoverPatterns: InnerCompletionItem[] = [
//     ShebangPattern,
//     ...preprocessors,
//     ...preprocessorOperators,
//     ...preprocessorKeywords,
//     CommentPattern,
//     ...VariablePatterns,
//     ...InjectionPatterns,
//     ...blockPatterns,
//     ...KeyPatterns,
//     ...ValuePatterns,
// ];


const tokenTypes = [
    'shebang',
    'preprocessor',
    'keyword',
    'comment',
    'variable',
    'injection',
    'block',
    'key',
    'value',
];
enum TokenType {
    Shebang = 0,
    Preprocessor,
    Keyword,
    Comment,
    Variable,
    Injection,
    Block,
    Key,
    Value
};
const tokenModifiers: string[] = [];

const legend: SemanticTokensLegend = {
  tokenTypes,
  tokenModifiers
};

function infixToPostfix(tokens: string[]): string[] {
    const output: string[] = [];
    const stack: string[] = [];

    const precedence: Record<string, number> = {
        'NOT': 3,
        'EQU': 2, 'NEQ': 2, 'GT': 2, 'LT': 2, 'GTE': 2, 'LTE': 2,
        'AND': 1, 'OR': 1
    };

    const rightAssociative = ['NOT'];

    for (const token of tokens) {
        if (token in precedence) {
            while (
                stack.length &&
                precedence[stack[stack.length - 1]] >= precedence[token] &&
                !rightAssociative.includes(token)
            ) {
                output.push(stack.pop()!);
            }
            stack.push(token);
        } else {
            // Operand
            output.push(token);
        }
    }

    while (stack.length) {
        output.push(stack.pop()!);
    }

    return output;
}

function validatePostfixExpression(postfix: string[]): boolean {
    const stack: number[] = [];

    for (const token of postfix) {
        switch (token) {
            case 'NOT':
                if (stack.length < 1) return false;
                stack.pop();
                stack.push(1);
                break;
            case 'AND': case 'OR':
            case 'EQU': case 'NEQ':
            case 'GT': case 'LT':
            case 'GTE': case 'LTE':
                if (stack.length < 2) return false;
                stack.pop();
                stack.pop();
                stack.push(1);
                break;
            default:
                stack.push(1); // Operand
        }
    }

    return stack.length === 1;
}

function tokenizeCondition(condition: string): string[] {
    return condition.trim().split(/\s+/);
}

function validateIfLine(line: string, lineNumber: number, diagnostics: Diagnostic[]) {
    const parts = tokenizeCondition(line);
    if (parts[0] !== '#.IF') return;

    const infixTokens = parts.slice(1);
    const postfix = infixToPostfix(infixTokens);

    if (!validatePostfixExpression(postfix)) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: lineNumber, character: 0 },
                end: { line: lineNumber, character: line.length }
            },
            message: `Invalid condition in #.IF. Expected a valid logical infix expression.`,
            source: 'atrc'
        });
    }
}


documents.onDidChangeContent(change => {
  validateDocument(change.document);
});

// Validation: warn on incorrect `.IF` usage
function validateDocument(doc: TextDocument): void {
  const diagnostics: Diagnostic[] = [];
  const lines = doc.getText().split(/\r?\n/);

  // 1. Check file start for #!ATRC
  if (!lines[0] || !ShebangPattern.match.test(lines[0].trim())) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: lines[0] ? lines[0].length : 0 }
      },
      message: `File must start with "${ShebangPattern.label}"`,
      source: 'atrc'
    });
  }

  // 2. Check that preprocessor directives start with #.
  lines.forEach((line, i) => {
    preprocessors.forEach(({ label }) => {
      const directive = label.substring(2); // remove "#." prefix, e.g. "IF"
      if (line.includes(directive) && line.trim().startsWith('.')) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length }
          },
          message: `${label} should start with \`#.\``,
          source: 'atrc'
        });
      }
    });
  });

  // 3. Validate IF-ELSE block logic with a stack
  type IfBlock = { line: number, hasElse: boolean };
  const ifStack: IfBlock[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('#.IF')) {

        const lineContent = trimmed.split(/\s+/).slice(1); // Get the condition part after #.IF
        // Check if the condition is valid
        if (lineContent.length === 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length }
                },
                message: `#.IF condition is missing`,
                source: 'atrc'
            });
        }

        validateIfLine(line, i, diagnostics);

        // Push new IF block
        ifStack.push({ line: i, hasElse: false });
    } else if (trimmed.startsWith('#.ELSEIF')) {
        if (ifStack.length === 0) {
            diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
            message: `#.ELSEIF without matching #.IF`,
            source: 'atrc'
        });

        const lineContent = trimmed.split(/\s+/).slice(1); // Get the condition part after #.IF
        // Check if the condition is valid
        if (lineContent.length === 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length }
                },
                message: `#.IF condition is missing`,
                source: 'atrc'
            });
        }

        validateIfLine(line, i, diagnostics);
        
      } else {
        const top = ifStack[ifStack.length - 1];
        if (top.hasElse) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
            message: `#.ELSEIF after #.ELSE is not allowed`,
            source: 'atrc'
          });
        }
      }
    } else if (trimmed.startsWith('#.ELSE')) {
      if (ifStack.length === 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          message: `#.ELSE without matching #.IF`,
          source: 'atrc'
        });
      } else {
        const top = ifStack[ifStack.length - 1];
        if (top.hasElse) {
          diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
            message: `Multiple #.ELSE blocks inside one #.IF are not allowed`,
            source: 'atrc'
          });
        } else {
          top.hasElse = true; // mark ELSE found
        }
      }
    } else if (trimmed.startsWith('#.ENDIF')) {
      if (ifStack.length === 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          message: `#.ENDIF without matching #.IF`,
          source: 'atrc'
        });
      } else {
        ifStack.pop();
      }
    }
  });

  // 4. At the end, warn for unclosed IF blocks
  ifStack.forEach(block => {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: { start: { line: block.line, character: 0 }, end: { line: block.line, character: lines[block.line].length } },
      message: `#.IF block not closed by #.ENDIF`,
      source: 'atrc'
    });
  });

  // TODO: add further validation on Variables, InjectionPatterns, blockPatterns, KeyPatterns as needed

  // Send diagnostics to client
  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

/*
function getHoveredWord(document: TextDocument, position: Position): string {
    const text = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line + 1, character: 0 }
    });

    const offset = document.offsetAt(position);
    // #!ATRC
    // #.NUMSTR
    // <%NUMSTR%=
    // %NUMSTR%=
    // %NUMSTR%
    // %*NUM%
    // %*%
    // [NUMSTR]
    // NUMSTR=
    // "NUMSTR"
    // 'NUMSTR'
    // NUMSTR
    // Allow words to be with discarding whitespace [NUMSTR], #.NUMSTR, %NUMSTR%, NUMSTR, "NUMSTR", NUMSTR=, <%NUMSTR%=, %NUMSTR%=
    const wordMatch = text.match(/(#!ATRC)|(#\.[A-Za-z0-9_]+)|(<%[A-Za-z0-9_]+%=)|(%[A-Za-z0-9_]+%=)|(%[A-Za-z0-9_]+%)|(%\*\d+%)|(%\*%)|(\[[A-Za-z0-9_]+\])|([A-Za-z0-9_]+(?==))|("[A-Za-z0-9_]+")|('[A-Za-z0-9_]+')|([A-Za-z0-9_]+)/g);
    if (!wordMatch) return '';

    let closest = '';
    for (const word of wordMatch) {
        const index = text.indexOf(word);
        if (index <= position.character && position.character <= index + word.length) {
            closest = word;
            break;
        }
    }
    return closest;
}


// Hover information
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const word = getHoveredWord(document, params.position);
    if (!word) return null;

    // Match against all known hoverable patterns
    for (const pattern of allHoverPatterns) {
        if (pattern.match.test(word)) {
            return {
                contents: {
                    kind: 'markdown',
                    value: `**${pattern.label}**\n\n${pattern.detail}`
                }
            };
        }
    }

    // Optional: fallback generic help
    if (word.startsWith('#.')) {
        return {
            contents: {
                kind: 'markdown',
                value: "**ATRC Preprocessor**\n\nUse control flow directives like `#.IF`, `#.ELSE`, `#.ENDIF`, etc."
            }
        };
    }

    return null;
});
*/

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return item;
});


// Completion provider
connection.onCompletion((params): CompletionItem[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const line = document.getText({
        start: { line: params.position.line, character: 0 },
        end: params.position
    });

    // Match already typed preprocessor keyword after #.
    const preprocessorMatch = line.match(/^\s*#\.(\w*)$/);
    if(!preprocessorMatch) {
        return combinedCompletions;
    }
    const alreadyTyped = preprocessorMatch?.[1] || "";

    return preprocessorCompletions.map(item => {
        const fullLabel = item.label; // e.g., '#.IF'
        const keyword = fullLabel.replace(/^#\./, ''); // e.g., 'IF'

        // If alreadyTyped is 'I', insert only 'F'
        const suffix = keyword.startsWith(alreadyTyped)
            ? keyword.slice(alreadyTyped.length)
            : keyword;

        return {
            ...item,
            filterText: keyword,              // Allow matching just 'IF' etc.
            insertText: suffix,               // Insert only what's missing
            label: fullLabel,                 // Show full label
            textEdit: {
                newText: suffix,
                range: {
                    start: {
                        line: params.position.line,
                        character: line.length - alreadyTyped.length
                    },
                    end: params.position
                }
            }
        };
    });
});



// Semantic tokens: mark ignored lines
connection.languages.semanticTokens.on((params: SemanticTokensParams): SemanticTokens => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return { data: [] };

  const builder = new SemanticTokensBuilder();

  const lines = doc.getText().split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*#\.IGNORE\s+(\d+)/);
    if (match) {
      const count = parseInt(match[1], 10);
      for (let j = 1; j <= count && i + j < lines.length; j++) {
        const lineText = lines[i + j];
        // mark the entire line as comment (tokenType index 0)
        builder.push(i + j, 0, lineText.length, TokenType.Comment, 0);
      }
    }
  }

  return builder.build();
});


documents.listen(connection);
connection.listen();
