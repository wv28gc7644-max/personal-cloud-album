import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  GitBranch,
  History,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUpdateHistory, UpdateHistoryItem } from '@/hooks/useUpdateHistory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const isHttpsContext = typeof window !== 'undefined' && window.location.protocol === 'https:';

function downloadTextFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function UpdatesSettings() {
  const [repoUrl, setRepoUrl] = useState(() =>
    localStorage.getItem('mediavault-github-repo') || ''
  );
  const [branch, setBranch] = useState(() =>
    localStorage.getItem('mediavault-github-branch') || 'main'
  );
  const [token, setToken] = useState(() =>
    localStorage.getItem('mediavault-github-token') || ''
  );
  const [updateCheckState, setUpdateCheckState] = useState<'idle' | 'checking' | 'available' | 'up-to-date' | 'error'>('idle');
  const [latestCommitInfo, setLatestCommitInfo] = useState<{ sha: string; message: string; date: string } | null>(null);
  const [changelog, setChangelog] = useState<Array<{ sha: string; message: string; date: string; author: string }>>([]);
  const [lastCheckDate, setLastCheckDate] = useState<string | null>(() =>
    localStorage.getItem('mediavault-last-update-check')
  );
  const [restoreTarget, setRestoreTarget] = useState<UpdateHistoryItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const { history: updateHistory, clearHistory: clearUpdateHistory } = useUpdateHistory();

  const currentVersion = localStorage.getItem('mediavault-local-version') || '';

  const saveRepoUrl = () => {
    localStorage.setItem('mediavault-github-repo', repoUrl);
    localStorage.setItem('mediavault-github-branch', branch);
    if (token) {
      localStorage.setItem('mediavault-github-token', token);
    }
    toast.success('Configuration GitHub sauvegardée');
  };

  const getServerUrl = useCallback(() => {
    return localStorage.getItem('mediavault-server-url') || 'http://localhost:3001';
  }, []);

  const downloadServerCjs = useCallback(() => {
    import('../../../server.cjs?raw').then(({ default: serverCjs }) => {
      downloadTextFile('server.cjs', serverCjs, 'application/javascript');
      toast.success('server.cjs téléchargé', {
        description: 'Placez-le dans le même dossier que vos .bat (ex: C:\\MediaVault\\)'
      });
    });
  }, []);

  const downloadStartBat = useCallback(() => {
    // Script avec journalisation + capture d’infos système (pour réduire les allers-retours)
    const bat = [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'title MediaVault - Demarrage',
      'color 0A',
      'chcp 65001 >nul',
      '',
      'set "MV_NAME=%~n0"',
      'set "MV_ROOT=%~dp0"',
      'set "MV_LOGROOT=%MV_ROOT%logs"',
      'for /f "delims=" %%i in (\'powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"\') do set "MV_TS=%%i"',
      'set "MV_RUN=%MV_NAME%-%MV_TS%"',
      'set "MV_LOGTMP=%MV_LOGROOT%\\_tmp"',
      'if not exist "%MV_LOGROOT%" mkdir "%MV_LOGROOT%" >nul 2>&1',
      'if not exist "%MV_LOGTMP%" mkdir "%MV_LOGTMP%" >nul 2>&1',
      'set "MV_LOGFILE=%MV_LOGTMP%\\%MV_RUN%.log"',
      '',
      'echo [INFO] Un log va etre cree puis affiche a la fin...',
      'echo [INFO] Log temporaire: %MV_LOGFILE%',
      '',
      'call :MAIN > "%MV_LOGFILE%" 2>&1',
      'set "MV_EXIT=%errorlevel%"',
      'set "MV_DEST=%MV_LOGROOT%\\ok\\%MV_RUN%.log"',
      'if %MV_EXIT% neq 0 set "MV_DEST=%MV_LOGROOT%\\fail\\%MV_RUN%.log"',
      '',
      'if %MV_EXIT% equ 0 (',
      '  if not exist "%MV_LOGROOT%\\ok" mkdir "%MV_LOGROOT%\\ok" >nul 2>&1',
      ') else (',
      '  if not exist "%MV_LOGROOT%\\fail" mkdir "%MV_LOGROOT%\\fail" >nul 2>&1',
      ')',
      'move /y "%MV_LOGFILE%" "%MV_DEST%" >nul',
      '',
      'echo.',
      'echo =====================================================================',
      'echo RESULTAT: %MV_EXIT%',
      'echo LOG: %MV_DEST%',
      'echo =====================================================================',
      'echo.',
      'type "%MV_DEST%"',
      'echo.',
      'start "" notepad "%MV_DEST%"',
      'echo.',
      'pause',
      'exit /b %MV_EXIT%',
      '',
      ':MAIN',
      'echo.',
      'echo  ============================================',
      'echo           MediaVault - Demarrage',
      'echo  ============================================',
      'echo.',
      'echo [META] Script: %~nx0',
      'echo [META] Dossier: %MV_ROOT%',
      'echo [META] Date: %date% %time%',
      'echo.',
      '',
      'echo [SYS] Windows:',
      'ver',
      'echo.',
      'echo [SYS] CPU / RAM / GPU (si dispo):',
      'wmic cpu get name /value 2>nul',
      'wmic computersystem get totalphysicalmemory /value 2>nul',
      'wmic path win32_videocontroller get name /value 2>nul',
      'echo.',
      'echo [SYS] Reseau (resume):',
      'ipconfig | findstr /i "IPv4 DNS"',
      'echo.',
      '',
      ':: Verifier Node.js',
      'echo [1/3] Verification de Node.js...',
      'where node >nul 2>nul',
      'if %errorlevel% neq 0 (',
      '    echo [ERREUR] Node.js n\'est pas installe!',
      '    echo Telecharger depuis: https://nodejs.org/',
      '    exit /b 1',
      ')',
      'for /f "tokens=1" %%i in (\'node -v\') do set NODE_VERSION=%%i',
      'echo       OK (Node.js %NODE_VERSION%)',
      '',
      ':: Aller au dossier du script',
      'echo [2/3] Navigation vers le dossier...',
      'cd /d "%MV_ROOT%"',
      'echo       Dossier: %CD%',
      '',
      ':: Lancer le serveur + ouvrir le navigateur',
      'echo [3/3] Demarrage du serveur...',
      'start "" "http://localhost:3001"',
      'echo [INFO] Ouverture d\'une fenetre serveur (logs en direct)...',
      'start "MediaVault Server" /d "%MV_ROOT%" cmd /k node server.cjs',
      'echo [OK] Serveur lance. Cette fenetre peut etre fermee.',
      'exit /b 0',
      '',
    ].join('\r\n');

    downloadTextFile('Lancer MediaVault.bat', bat, 'application/x-bat');
    toast.success('Lancer MediaVault.bat téléchargé', {
      description: 'Crée un dossier logs\\ok et logs\\fail pour tout diagnostiquer en 1 fois.'
    });
  }, []);

  const downloadUpdateBat = useCallback(() => {
    // Script “1 clic”:
    // - si repo Git: force sync (fetch + reset) + npm install + build
    // - si pas repo Git: bootstrap via téléchargement GitHub (zip/clone) en conservant media/ + data.json
    // IMPORTANT: on embarque repoUrl/branch dans le .bat pour qu'il soit autonome

    const safeRepoUrl = (repoUrl || '').replace(/"/g, '');
    const safeBranch = (branch || 'main').replace(/"/g, '');

    const bat = [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'title MediaVault - Mise a jour',
      'color 0A',
      'chcp 65001 >nul',
      '',
      'set "MV_NAME=%~n0"',
      'set "MV_ROOT=%~dp0"',
      'set "MV_LOGROOT=%MV_ROOT%logs"',
      'for /f "delims=" %%i in (\'powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"\') do set "MV_TS=%%i"',
      'set "MV_RUN=%MV_NAME%-%MV_TS%"',
      'set "MV_LOGTMP=%MV_LOGROOT%\\_tmp"',
      'if not exist "%MV_LOGROOT%" mkdir "%MV_LOGROOT%" >nul 2>&1',
      'if not exist "%MV_LOGTMP%" mkdir "%MV_LOGTMP%" >nul 2>&1',
      'set "MV_LOGFILE=%MV_LOGTMP%\\%MV_RUN%.log"',
      '',
      // Embedded settings from the UI (so the .bat works without opening the app)
      `set "MV_REPO_URL=${safeRepoUrl}"`,
      `set "MV_BRANCH_PREF=${safeBranch}"`,
      '',
      'echo [INFO] Un log va etre cree puis affiche a la fin...',
      'echo [INFO] Log temporaire: %MV_LOGFILE%',
      '',
      'call :MAIN > "%MV_LOGFILE%" 2>&1',
      'set "MV_EXIT=%errorlevel%"',
      'set "MV_DEST=%MV_LOGROOT%\\ok\\%MV_RUN%.log"',
      'if %MV_EXIT% neq 0 set "MV_DEST=%MV_LOGROOT%\\fail\\%MV_RUN%.log"',
      '',
      'if %MV_EXIT% equ 0 (',
      '  if not exist "%MV_LOGROOT%\\ok" mkdir "%MV_LOGROOT%\\ok" >nul 2>&1',
      ') else (',
      '  if not exist "%MV_LOGROOT%\\fail" mkdir "%MV_LOGROOT%\\fail" >nul 2>&1',
      ')',
      'move /y "%MV_LOGFILE%" "%MV_DEST%" >nul',
      '',
      'echo.',
      'echo =====================================================================',
      'echo RESULTAT: %MV_EXIT%',
      'echo LOG: %MV_DEST%',
      'echo =====================================================================',
      'echo.',
      'type "%MV_DEST%"',
      'echo.',
      'start "" notepad "%MV_DEST%"',
      'echo.',
      'pause',
      'exit /b %MV_EXIT%',
      '',
      ':MAIN',
      'echo ============================================',
      'echo        MediaVault - Mise a jour (1 clic)',
      'echo ============================================',
      'echo.',
      'cd /d "%MV_ROOT%"',
      'echo [META] Dossier: %CD%',
      'echo [META] Repo: %MV_REPO_URL%',
      'echo [META] Branche pref: %MV_BRANCH_PREF%',
      'echo.',
      '',
      'where git >nul 2>nul',
      'if errorlevel 1 goto GIT_MISSING',
      '',
      'where node >nul 2>nul',
      'if errorlevel 1 goto NODE_MISSING',
      '',
      'call :PRESERVE',
      '',
      'if exist "%MV_ROOT%\\.git\\HEAD" (',
      '  call :UPDATE_GIT',
      ') else (',
      '  call :BOOTSTRAP_NONGIT',
      ')',
      'if errorlevel 1 exit /b %errorlevel%',
      '',
      'call :NPM_INSTALL_BUILD',
      'if errorlevel 1 exit /b %errorlevel%',
      '',
      'call :RESTORE',
      'if errorlevel 1 exit /b %errorlevel%',
      '',
      'echo [OK] Mise a jour terminee.',
      'exit /b 0',
      '',
      ':: ----------------------------',
      ':: Preserve / Restore user data',
      ':: ----------------------------',
      ':PRESERVE',
      'set "MV_TMP=%TEMP%\\mediavault_update_%MV_TS%"',
      'set "MV_KEEP=%MV_TMP%\\keep"',
      'if not exist "%MV_KEEP%" mkdir "%MV_KEEP%" >nul 2>&1',
      'echo [0/4] Sauvegarde des donnees utilisateur (media/, data.json, AI/)...',
      'if exist "%MV_ROOT%\\data.json" copy /y "%MV_ROOT%\\data.json" "%MV_KEEP%\\data.json" >nul 2>&1',
      'if exist "%MV_ROOT%\\media" robocopy "%MV_ROOT%\\media" "%MV_KEEP%\\media" /E /NFL /NDL /NJH /NJS >nul',
      'if exist "%MV_ROOT%\\AI" robocopy "%MV_ROOT%\\AI" "%MV_KEEP%\\AI" /E /NFL /NDL /NJH /NJS >nul',
      'exit /b 0',
      '',
      ':RESTORE',
      'echo [4/4] Restauration des donnees utilisateur...',
      'if exist "%MV_KEEP%\\data.json" copy /y "%MV_KEEP%\\data.json" "%MV_ROOT%\\data.json" >nul 2>&1',
      'if exist "%MV_KEEP%\\media" robocopy "%MV_KEEP%\\media" "%MV_ROOT%\\media" /E /NFL /NDL /NJH /NJS >nul',
      'if exist "%MV_KEEP%\\AI" robocopy "%MV_KEEP%\\AI" "%MV_ROOT%\\AI" /E /NFL /NDL /NJH /NJS >nul',
      'exit /b 0',
      '',
      ':: ----------------------------',
      ':: Update flows',
      ':: ----------------------------',
      ':UPDATE_GIT',
      'echo [1/4] Mode Git: synchro forcee...',
      'git rev-parse --is-inside-work-tree >nul 2>nul',
      'if errorlevel 1 goto NOT_GIT',
      '',
      'for /f "delims=" %%b in (\'git rev-parse --abbrev-ref HEAD 2^>nul\') do set "BRANCH=%%b"',
      'if "%BRANCH%"=="" set "BRANCH=%MV_BRANCH_PREF%"',
      'echo Branche locale: %BRANCH%',
      '',
      'git remote get-url origin >nul 2>nul',
      'if errorlevel 1 (',
      '  if not "%MV_REPO_URL%"=="" (',
      '    echo [INFO] Remote origin manquant, ajout...',
      '    git remote add origin "%MV_REPO_URL%"',
      '  )',
      ')',
      '',
      'git fetch --all --prune',
      'if errorlevel 1 goto FETCH_FAIL',
      '',
      ':: on se cale sur origin/BRANCH (ou fallback)',
      'git show-ref --verify --quiet "refs/remotes/origin/%BRANCH%"',
      'if errorlevel 1 (',
      '  if /i "%BRANCH%"=="main" set "BRANCH=master"',
      '  if /i "%BRANCH%"=="master" set "BRANCH=main"',
      ')',
      'git show-ref --verify --quiet "refs/remotes/origin/%BRANCH%"',
      'if errorlevel 1 goto REMOTE_BRANCH_MISSING',
      '',
      'git reset --hard "origin/%BRANCH%"',
      'if errorlevel 1 goto RESET_FAIL',
      'exit /b 0',
      '',
      ':BOOTSTRAP_NONGIT',
      'echo [1/4] Mode sans Git: telechargement + installation...',
      'if "%MV_REPO_URL%"=="" goto REPO_MISSING',
      '',
      ':: Parse owner/repo depuis https://github.com/owner/repo',
      'for /f "tokens=1-3 delims=/" %%a in ("%MV_REPO_URL%") do (',
      '  set "MV_OWNER=%%b"',
      '  set "MV_REPO=%%c"',
      ')',
      'if "%MV_OWNER%"=="" goto REPO_MISSING',
      'if "%MV_REPO%"=="" goto REPO_MISSING',
      'set "MV_REPO=%MV_REPO:.git=%"',
      '',
      'set "MV_DL=%MV_TMP%\\repo.zip"',
      'set "MV_EX=%MV_TMP%\\extract"',
      'if not exist "%MV_EX%" mkdir "%MV_EX%" >nul 2>&1',
      '',
      'set "MV_DL_BRANCH=%MV_BRANCH_PREF%"',
      'call :DOWNLOAD_ZIP',
      'if errorlevel 1 (',
      '  if /i "%MV_DL_BRANCH%"=="main" (set "MV_DL_BRANCH=master") else (set "MV_DL_BRANCH=main")',
      '  call :DOWNLOAD_ZIP',
      ')',
      'if errorlevel 1 goto DOWNLOAD_FAIL',
      '',
      'powershell -NoProfile -Command "Expand-Archive -Force \"%MV_DL%\" \"%MV_EX%\""',
      'if errorlevel 1 goto EXTRACT_FAIL',
      '',
      'for /d %%D in ("%MV_EX%\\*") do set "MV_SRC=%%D"',
      'if "%MV_SRC%"=="" goto EXTRACT_FAIL',
      '',
      ':: Nettoyage minimal (pour eviter les conflits)',
      'if exist "%MV_ROOT%\\dist" rmdir /s /q "%MV_ROOT%\\dist" >nul 2>&1',
      'if exist "%MV_ROOT%\\node_modules" rmdir /s /q "%MV_ROOT%\\node_modules" >nul 2>&1',
      '',
      'robocopy "%MV_SRC%" "%MV_ROOT%" /E /XD .git media AI logs /XF data.json /NFL /NDL /NJH /NJS >nul',
      'exit /b 0',
      '',
      ':DOWNLOAD_ZIP',
      'echo [INFO] Download: %MV_OWNER%/%MV_REPO% (%MV_DL_BRANCH%)',
      'powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing -Uri \"https://codeload.github.com/%MV_OWNER%/%MV_REPO%/zip/refs/heads/%MV_DL_BRANCH%\" -OutFile \"%MV_DL%\""',
      'exit /b %errorlevel%',
      '',
      ':: ----------------------------',
      ':: Build',
      ':: ----------------------------',
      ':NPM_INSTALL_BUILD',
      'echo [2/4] Installation dependances (npm install)...',
      'cd /d "%MV_ROOT%"',
      'call npm install',
      'if errorlevel 1 goto NPM_INSTALL_FAIL',
      '',
      'echo [3/4] Build (npm run build)...',
      'call npm run build',
      'if errorlevel 1 goto BUILD_FAIL',
      'exit /b 0',
      '',
      ':: ----------------------------',
      ':: Errors',
      ':: ----------------------------',
      ':GIT_MISSING',
      "echo [ERREUR] Git n'est pas installe. https://git-scm.com/downloads",
      'exit /b 10',
      '',
      ':NODE_MISSING',
      "echo [ERREUR] Node.js n'est pas installe. https://nodejs.org/",
      'exit /b 11',
      '',
      ':REPO_MISSING',
      'echo [ERREUR] Repo non configure. Ouvrez MediaVault > Parametres > Mises a jour et renseignez l\'URL GitHub.',
      'exit /b 12',
      '',
      ':NOT_GIT',
      'echo [ERREUR] Dossier incoherent: .git detecte mais pas un repo valide.',
      'exit /b 13',
      '',
      ':FETCH_FAIL',
      'echo [ERREUR] git fetch a echoue.',
      'exit /b 14',
      '',
      ':REMOTE_BRANCH_MISSING',
      'echo [ERREUR] Branche distante introuvable (origin/%BRANCH%).',
      'exit /b 15',
      '',
      ':RESET_FAIL',
      'echo [ERREUR] git reset --hard a echoue.',
      'exit /b 16',
      '',
      ':DOWNLOAD_FAIL',
      'echo [ERREUR] Telechargement du projet impossible.',
      'exit /b 17',
      '',
      ':EXTRACT_FAIL',
      'echo [ERREUR] Extraction du zip impossible.',
      'exit /b 18',
      '',
      ':NPM_INSTALL_FAIL',
      'echo [ERREUR] npm install a echoue.',
      'exit /b 19',
      '',
      ':BUILD_FAIL',
      'echo [ERREUR] npm run build a echoue.',
      'exit /b 20',
      '',
    ].join('\r\n');

    downloadTextFile('Mettre a jour MediaVault.bat', bat, 'application/x-bat');
    toast.success('Mettre a jour MediaVault.bat téléchargé', {
      description: '1 clic: met à jour, reconstruit, et conserve media/ + data.json.'
    });
  }, [repoUrl, branch]);

  const downloadSilentUpdateBat = useCallback(() => {
    const safeRepoUrl = (repoUrl || '').replace(/"/g, '');
    const safeBranch = (branch || 'main').replace(/"/g, '');

    // Silent update: runs completely hidden, logs everything, shows Windows notification at end
    const bat = [
      '@echo off',
      ':: MediaVault - Mise a jour SILENCIEUSE',
      ':: Ce script s\'execute entierement en arriere-plan',
      ':: Une notification Windows apparaitra a la fin',
      '',
      ':: Re-lancer en mode cache si pas deja fait',
      'if "%~1"=="" (',
      '  powershell -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList \'/c \"\"%~f0\"\" silent\' -WindowStyle Hidden"',
      '  exit /b 0',
      ')',
      '',
      'setlocal enabledelayedexpansion',
      '',
      'set "MV_ROOT=%~dp0"',
      'set "MV_LOGROOT=%MV_ROOT%logs\\silent"',
      'for /f "delims=" %%i in (\'powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"\') do set "MV_TS=%%i"',
      'set "MV_LOGFILE=%MV_LOGROOT%\\update-%MV_TS%.log"',
      'if not exist "%MV_LOGROOT%" mkdir "%MV_LOGROOT%" >nul 2>&1',
      '',
      `set "MV_REPO_URL=${safeRepoUrl}"`,
      `set "MV_BRANCH_PREF=${safeBranch}"`,
      '',
      ':: Executer la mise a jour',
      'call :MAIN > "%MV_LOGFILE%" 2>&1',
      'set "MV_EXIT=%errorlevel%"',
      '',
      ':: Notification Windows',
      'if %MV_EXIT% equ 0 (',
      '  powershell -NoProfile -Command "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $text = $xml.GetElementsByTagName(\'text\'); $text.Item(0).AppendChild($xml.CreateTextNode(\'MediaVault\')) | Out-Null; $text.Item(1).AppendChild($xml.CreateTextNode(\'Mise a jour terminee avec succes!\')) | Out-Null; $toast = [Windows.UI.Notifications.ToastNotification]::new($xml); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(\'MediaVault\').Show($toast)"',
      ') else (',
      '  powershell -NoProfile -Command "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $text = $xml.GetElementsByTagName(\'text\'); $text.Item(0).AppendChild($xml.CreateTextNode(\'MediaVault - Erreur\')) | Out-Null; $text.Item(1).AppendChild($xml.CreateTextNode(\'Echec de la mise a jour. Voir les logs.\')) | Out-Null; $toast = [Windows.UI.Notifications.ToastNotification]::new($xml); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(\'MediaVault\').Show($toast)"',
      '  start "" notepad "%MV_LOGFILE%"',
      ')',
      'exit /b %MV_EXIT%',
      '',
      ':MAIN',
      'echo ============================================',
      'echo     MediaVault - Mise a jour SILENCIEUSE',
      'echo ============================================',
      'echo.',
      'echo [META] Date: %date% %time%',
      'echo [META] Dossier: %MV_ROOT%',
      'echo [META] Repo: %MV_REPO_URL%',
      'echo [META] Branche: %MV_BRANCH_PREF%',
      'echo.',
      '',
      'cd /d "%MV_ROOT%"',
      '',
      'where git >nul 2>nul',
      'if errorlevel 1 (',
      '  echo [ERREUR] Git non installe',
      '  exit /b 10',
      ')',
      '',
      'where node >nul 2>nul',
      'if errorlevel 1 (',
      '  echo [ERREUR] Node.js non installe',
      '  exit /b 11',
      ')',
      '',
      ':: Sauvegarde',
      'set "MV_TMP=%TEMP%\\mediavault_silent_%MV_TS%"',
      'set "MV_KEEP=%MV_TMP%\\keep"',
      'if not exist "%MV_KEEP%" mkdir "%MV_KEEP%" >nul 2>&1',
      'echo [1/4] Sauvegarde des donnees...',
      'if exist "%MV_ROOT%\\data.json" copy /y "%MV_ROOT%\\data.json" "%MV_KEEP%\\data.json" >nul 2>&1',
      'if exist "%MV_ROOT%\\media" robocopy "%MV_ROOT%\\media" "%MV_KEEP%\\media" /E /NFL /NDL /NJH /NJS >nul',
      'if exist "%MV_ROOT%\\AI" robocopy "%MV_ROOT%\\AI" "%MV_KEEP%\\AI" /E /NFL /NDL /NJH /NJS >nul',
      '',
      ':: Mise a jour Git ou ZIP',
      'if exist "%MV_ROOT%\\.git\\HEAD" (',
      '  echo [2/4] Mode Git: synchro forcee...',
      '  for /f "delims=" %%b in (\'git rev-parse --abbrev-ref HEAD 2^>nul\') do set "BRANCH=%%b"',
      '  if "!BRANCH!"=="" set "BRANCH=%MV_BRANCH_PREF%"',
      '  git fetch --all --prune >nul 2>&1',
      '  if errorlevel 1 (',
      '    echo [ERREUR] git fetch echoue',
      '    exit /b 14',
      '  )',
      '  git reset --hard "origin/!BRANCH!" >nul 2>&1',
      '  if errorlevel 1 (',
      '    echo [ERREUR] git reset echoue',
      '    exit /b 16',
      '  )',
      ') else (',
      '  echo [2/4] Mode ZIP: telechargement...',
      '  if "%MV_REPO_URL%"=="" (',
      '    echo [ERREUR] Repo non configure',
      '    exit /b 12',
      '  )',
      '  for /f "tokens=4,5 delims=/" %%a in ("%MV_REPO_URL%") do (',
      '    set "MV_OWNER=%%a"',
      '    set "MV_REPO=%%b"',
      '  )',
      '  set "MV_REPO=!MV_REPO:.git=!"',
      '  set "MV_DL=%MV_TMP%\\repo.zip"',
      '  set "MV_EX=%MV_TMP%\\extract"',
      '  if not exist "!MV_EX!" mkdir "!MV_EX!" >nul 2>&1',
      '  powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing -Uri \\"https://codeload.github.com/!MV_OWNER!/!MV_REPO!/zip/refs/heads/%MV_BRANCH_PREF%\\" -OutFile \\"!MV_DL!\\"" >nul 2>&1',
      '  if errorlevel 1 (',
      '    echo [ERREUR] Telechargement echoue',
      '    exit /b 17',
      '  )',
      '  powershell -NoProfile -Command "Expand-Archive -Force \\"!MV_DL!\\" \\"!MV_EX!\\"" >nul 2>&1',
      '  for /d %%D in ("!MV_EX!\\*") do set "MV_SRC=%%D"',
      '  if exist "%MV_ROOT%\\node_modules" rmdir /s /q "%MV_ROOT%\\node_modules" >nul 2>&1',
      '  robocopy "!MV_SRC!" "%MV_ROOT%" /E /XD .git media AI logs /XF data.json /NFL /NDL /NJH /NJS >nul',
      ')',
      '',
      ':: Build',
      'echo [3/4] Installation dependances...',
      'call npm install >nul 2>&1',
      'if errorlevel 1 (',
      '  echo [ERREUR] npm install echoue',
      '  exit /b 19',
      ')',
      '',
      'echo [4/4] Build...',
      'call npm run build >nul 2>&1',
      'if errorlevel 1 (',
      '  echo [ERREUR] npm run build echoue',
      '  exit /b 20',
      ')',
      '',
      ':: Restauration',
      'echo [OK] Restauration des donnees...',
      'if exist "%MV_KEEP%\\data.json" copy /y "%MV_KEEP%\\data.json" "%MV_ROOT%\\data.json" >nul 2>&1',
      'if exist "%MV_KEEP%\\media" robocopy "%MV_KEEP%\\media" "%MV_ROOT%\\media" /E /NFL /NDL /NJH /NJS >nul',
      'if exist "%MV_KEEP%\\AI" robocopy "%MV_KEEP%\\AI" "%MV_ROOT%\\AI" /E /NFL /NDL /NJH /NJS >nul',
      '',
      'echo [OK] Mise a jour silencieuse terminee!',
      'exit /b 0',
      '',
    ].join('\r\n');

    downloadTextFile('Mettre a jour MediaVault (silencieux).bat', bat, 'application/x-bat');
    toast.success('Script silencieux téléchargé', {
      description: 'Mise à jour en arrière-plan avec notification Windows à la fin.'
    });
  }, [repoUrl, branch]);

  const checkForUpdates = async () => {
    setUpdateCheckState('checking');
    setLatestCommitInfo(null);

    if (!repoUrl) {
      toast.error('URL du repository non configurée');
      setUpdateCheckState('error');
      return;
    }

    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        toast.error('URL GitHub invalide');
        setUpdateCheckState('error');
        return;
      }

      const [, owner, repo] = match;
      const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      let response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, { headers });

      if (!response.ok && response.status === 404 && branch === 'main') {
        response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/master`, { headers });
        if (response.ok) {
          localStorage.setItem('mediavault-github-branch', 'master');
          setBranch('master');
        }
      }

      if (!response.ok) {
        toast.error('Erreur de connexion à GitHub');
        setUpdateCheckState('error');
        return;
      }

      const data = await response.json();

      const commitInfo = {
        sha: data.sha.substring(0, 7),
        message: data.commit.message.split('\n')[0].substring(0, 60),
        date: new Date(data.commit.author.date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      localStorage.setItem('mediavault-latest-full-sha', data.sha);
      setLatestCommitInfo(commitInfo);

      const checkDate = new Date().toISOString();
      localStorage.setItem('mediavault-last-update-check', checkDate);
      setLastCheckDate(checkDate);

      const localVersion = localStorage.getItem('mediavault-local-version');

      if (localVersion === data.sha) {
        setUpdateCheckState('up-to-date');
        setChangelog([]);
        toast.success('Vous êtes à jour !');
      } else {
        setUpdateCheckState('available');
        toast.info('Mise à jour disponible !');

        // Fetch changelog
        if (localVersion) {
          try {
            const commitsResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/commits?sha=${data.sha}&per_page=30`,
              { headers }
            );

            if (commitsResponse.ok) {
              const commitsData = await commitsResponse.json();
              const filteredCommits: Array<{ sha: string; message: string; date: string; author: string }> = [];

              for (const commit of commitsData) {
                if (commit.sha === localVersion) break;

                filteredCommits.push({
                  sha: commit.sha.substring(0, 7),
                  message: commit.commit.message.split('\n')[0],
                  date: new Date(commit.commit.author.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short'
                  }),
                  author: commit.commit.author.name
                });
              }

              setChangelog(filteredCommits);
              localStorage.setItem('mediavault-changelog', JSON.stringify(filteredCommits));
            }
          } catch (changelogErr) {
            console.debug('Failed to fetch changelog:', changelogErr);
            setChangelog([]);
          }
        }
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      toast.error('Erreur de connexion');
      setUpdateCheckState('error');
    }
  };

  const markAsUpdated = () => {
    const fullSha = localStorage.getItem('mediavault-latest-full-sha');
    if (fullSha) {
      localStorage.setItem('mediavault-local-version', fullSha);
      setUpdateCheckState('up-to-date');
      setChangelog([]);
      localStorage.removeItem('mediavault-changelog');
      toast.success('Version marquée comme installée');
      window.dispatchEvent(new CustomEvent('mediavault-update-status-changed'));
    }
  };

  const handleRestoreVersion = async (item: UpdateHistoryItem) => {
    setIsRestoring(true);
    const fullVersion = localStorage.getItem(`mediavault-version-sha-${item.fromVersion}`) || item.fromVersion;

    try {
      const response = await fetch(`${getServerUrl()}/api/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: fullVersion }),
      });

      if (response.ok) {
        toast.success('Restauration lancée');
        setTimeout(() => window.location.reload(), 10000);
      } else {
        toast.error('Erreur de restauration');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setIsRestoring(false);
      setRestoreTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* IMPORTANT: si on est en preview HTTPS, on ne peut pas piloter le serveur local en HTTP */}
      {isHttpsContext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Preview (HTTPS) : serveur local non pilotable
            </CardTitle>
            <CardDescription>
              Depuis la preview, le navigateur bloque les appels vers <code>http://localhost</code>. Pour démarrer / mettre à jour, ouvrez MediaVault en local.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={() => window.open('http://localhost:3001', '_blank')}>
                <ExternalLink className="w-4 h-4" />
                Ouvrir http://localhost:3001
              </Button>
              <Button type="button" variant="secondary" className="gap-2" onClick={downloadStartBat}>
                <Download className="w-4 h-4" />
                Télécharger Lancer MediaVault.bat
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Si <code>http://localhost:3001</code> ne répond pas, c’est que le serveur n’est pas lancé sur votre PC.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Démarrage + scripts (toujours visibles) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Démarrer / Mettre à jour (scripts)
          </CardTitle>
          <CardDescription>
            Téléchargements + logs automatiques (OK/FAIL) pour diagnostiquer en une seule fois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={downloadServerCjs}>
              <Download className="w-4 h-4" />
              server.cjs
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={downloadStartBat}>
              <Download className="w-4 h-4" />
              Lancer MediaVault.bat
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={downloadUpdateBat}>
              <Download className="w-4 h-4" />
              Mettre a jour.bat
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={downloadSilentUpdateBat}>
              <Download className="w-4 h-4" />
              Mise à jour silencieuse
            </Button>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm font-medium mb-1">💡 Mise à jour silencieuse</p>
            <p className="text-xs text-muted-foreground">
              S'exécute en arrière-plan sans fenêtre visible. Une notification Windows apparaît à la fin (succès ou échec). 
              Les logs sont dans <code>logs/silent/</code>.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Où mettre les fichiers :</p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Créez <code>C:\\MediaVault\\</code></li>
              <li>Mettez dedans : <code>server.cjs</code>, <code>Lancer MediaVault.bat</code>, <code>Mettre a jour MediaVault.bat</code></li>
              <li>Double-cliquez <code>Lancer MediaVault.bat</code> → ça ouvre <code>http://localhost:3001</code></li>
              <li>Pour diagnostiquer : ouvrez <code>C:\\MediaVault\\logs\\fail</code> et envoyez-moi le dernier fichier</li>
            </ol>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="manual">
              <AccordionTrigger>Procédure manuelle (dérouler)</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Démarrage serveur (manuel)</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Installez Node.js LTS.</li>
                      <li>Créez <code>C:\\MediaVault\\</code>.</li>
                      <li>Copiez <code>server.cjs</code> dans ce dossier.</li>
                      <li>Ouvrez un terminal dans <code>C:\\MediaVault\\</code> et lancez : <code>node server.cjs</code></li>
                      <li>Ouvrez ensuite : <code>http://localhost:3001</code></li>
                    </ol>
                  </div>

                  <div>
                    <p className="font-medium text-foreground">Mise à jour (2 méthodes)</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>
                        <span className="font-medium">Sans Git (recommandé)</span> : retéléchargez <code>server.cjs</code> ici, puis remplacez le fichier dans <code>C:\\MediaVault\\</code>.
                      </li>
                      <li>
                        <span className="font-medium">Avec Git (avancé)</span> : le dossier doit être un clone (avec <code>.git</code>). Ensuite lancez le script <code>Mettre a jour MediaVault.bat</code>.
                      </li>
                    </ol>
                    <p className="mt-2">Astuce : si la mise à jour échoue, envoyez le dernier log dans <code>logs\\fail</code> (il contient aussi les infos machine utiles).</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Configuration GitHub */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Configuration GitHub
          </CardTitle>
          <CardDescription>Connectez votre repository pour les mises à jour</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">URL du repository</Label>
            <Input
              id="repo-url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branche</Label>
              <Input
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token (optionnel)</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
              />
            </div>
          </div>

          <Button onClick={saveRepoUrl} variant="secondary">
            Sauvegarder la configuration
          </Button>
        </CardContent>
      </Card>

      {/* Vérification des mises à jour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Mises à jour
          </CardTitle>
          <CardDescription>
            {currentVersion ? `Version actuelle: ${currentVersion.substring(0, 7)}` : 'Version non définie'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={checkForUpdates}
              disabled={updateCheckState === 'checking'}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', updateCheckState === 'checking' && 'animate-spin')} />
              Vérifier les mises à jour
            </Button>

            {updateCheckState === 'available' && (
              <Button onClick={markAsUpdated} variant="outline" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Marquer comme à jour
              </Button>
            )}
          </div>

          {/* Status */}
          {updateCheckState !== 'idle' && (
            <div className={cn(
              'p-3 rounded-lg border',
              updateCheckState === 'up-to-date' && 'bg-green-500/10 border-green-500/30',
              updateCheckState === 'available' && 'bg-yellow-500/10 border-yellow-500/30',
              updateCheckState === 'error' && 'bg-destructive/10 border-destructive/30'
            )}>
              <div className="flex items-center gap-2">
                {updateCheckState === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
                {updateCheckState === 'up-to-date' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {updateCheckState === 'available' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                {updateCheckState === 'error' && <XCircle className="w-4 h-4 text-destructive" />}

                <span className="font-medium">
                  {updateCheckState === 'checking' && 'Vérification en cours...'}
                  {updateCheckState === 'up-to-date' && 'Vous êtes à jour !'}
                  {updateCheckState === 'available' && 'Mise à jour disponible'}
                  {updateCheckState === 'error' && 'Erreur de vérification'}
                </span>
              </div>

              {latestCommitInfo && updateCheckState === 'available' && (
                <p className="text-sm text-muted-foreground mt-2">
                  {latestCommitInfo.sha}: {latestCommitInfo.message}
                </p>
              )}
            </div>
          )}

          {/* Changelog */}
          {changelog.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Changelog ({changelog.length} commits)</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {changelog.map((commit) => (
                  <div key={commit.sha} className="text-sm p-2 bg-muted/30 rounded flex items-start gap-2">
                    <code className="text-xs text-primary">{commit.sha}</code>
                    <span className="flex-1 text-muted-foreground">{commit.message}</span>
                    <span className="text-xs text-muted-foreground">{commit.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastCheckDate && (
            <p className="text-xs text-muted-foreground">
              Dernière vérification: {new Date(lastCheckDate).toLocaleString('fr-FR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historique des mises à jour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des mises à jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {updateHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucune mise à jour enregistrée</p>
          ) : (
            <div className="space-y-2">
              {updateHistory.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <p className="text-sm font-medium">
                      {item.fromVersion?.substring(0, 7)} → {item.toVersion?.substring(0, 7)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setRestoreTarget(item)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restaurer cette version ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cela va restaurer la version {item.fromVersion?.substring(0, 7)}.
                          L'application redémarrera automatiquement.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRestoreVersion(item)}
                          disabled={isRestoring}
                        >
                          {isRestoring ? 'Restauration...' : 'Restaurer'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}

              {updateHistory.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearUpdateHistory}
                  className="w-full mt-2"
                >
                  Effacer l'historique
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
