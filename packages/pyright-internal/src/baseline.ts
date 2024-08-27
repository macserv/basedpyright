import { DiagnosticRule } from './common/diagnosticRules';
import { FileDiagnostics } from './common/diagnosticSink';
import { Range } from './common/textRange';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { Uri } from './common/uri/uri';

interface BaselineFile {
    files: {
        [filePath: string]: {
            code: DiagnosticRule | undefined;
            message: string;
            range: Range;
        }[];
    };
}

export const baselineFilePath = (rootDir: Uri) => rootDir.combinePaths('.basedpyright/baseline.json');

export const diagnosticsToBaseline = (rootDir: Uri, filesWithDiagnostics: FileDiagnostics[]): BaselineFile => {
    const baselineData: BaselineFile = {
        files: {},
    };
    for (const fileWithDiagnostics of filesWithDiagnostics) {
        const filePath = rootDir.getRelativePath(fileWithDiagnostics.fileUri)!.toString();
        if (!fileWithDiagnostics.diagnostics.length) {
            continue;
        }
        if (!(filePath in baselineData.files)) {
            baselineData.files[filePath] = [];
        }
        baselineData.files[filePath].push(
            ...fileWithDiagnostics.diagnostics.map((diagnostic) => ({
                code: diagnostic.getRule() as DiagnosticRule | undefined,
                message: diagnostic.message,
                range: diagnostic.range,
            }))
        );
    }
    return baselineData;
};

export const writeBaselineFile = (rootDir: Uri, baselineData: BaselineFile) => {
    const baselineFile = baselineFilePath(rootDir);
    mkdirSync(baselineFile.getDirectory().getPath(), { recursive: true });
    writeFileSync(baselineFile.getPath(), JSON.stringify(baselineData, undefined, 4));
};

export const writeDiagnosticsToBaselineFile = async (rootDir: Uri, filesWithDiagnostics: FileDiagnostics[]) => {
    const baselineData = diagnosticsToBaseline(rootDir, filesWithDiagnostics);
    writeBaselineFile(rootDir, baselineData);
};

export const getBaselinedErrors = (rootDir: Uri): BaselineFile => {
    const path = baselineFilePath(rootDir).getPath();
    let baselineFileContents;
    try {
        baselineFileContents = readFileSync(path, 'utf8');
    } catch (e) {
        return { files: {} };
    }
    return JSON.parse(baselineFileContents);
};

export const filterOutBaselinedDiagnostics = (
    rootDir: Uri,
    filesWithDiagnostics: readonly FileDiagnostics[]
): FileDiagnostics[] => {
    const baselineFile = getBaselinedErrors(rootDir);
    return filesWithDiagnostics.map((fileWithDiagnostics) => {
        const baselinedErrorsForFile =
            baselineFile.files[rootDir.getRelativePath(fileWithDiagnostics.fileUri)!.toString()];
        if (!baselinedErrorsForFile) {
            return fileWithDiagnostics;
        }
        return {
            ...fileWithDiagnostics,
            diagnostics: fileWithDiagnostics.diagnostics.filter((diagnostic) => {
                const matchedIndex = baselinedErrorsForFile.findIndex(
                    (baselinedError) =>
                        baselinedError.message === diagnostic.message &&
                        baselinedError.code === diagnostic.getRule() &&
                        baselinedError.range.start.character === diagnostic.range.start.character &&
                        baselinedError.range.end.character === diagnostic.range.end.character
                );
                if (matchedIndex >= 0) {
                    baselinedErrorsForFile.splice(matchedIndex, 1);
                    return false;
                } else {
                    return true;
                }
            }),
        };
    });
};
