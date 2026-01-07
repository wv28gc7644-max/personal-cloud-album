import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Server, CheckCircle2, XCircle, Loader2, FolderOpen, Play, FileText, HardDrive, ArrowRight, Copy, Check } from 'lucide-react';
import { useLocalServer } from '@/hooks/useLocalServer';
import { toast } from 'sonner';

const LocalServerDownload = () => {
  const { isConnected, testConnection } = useLocalServer();
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setChecking(true);
    await testConnection();
    setChecking(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copié dans le presse-papiers!');
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadServerFile = () => {
    // Télécharger server.cjs directement depuis le projet
    const link = document.createElement('a');
    link.href = '/server.cjs';
    link.download = 'server.cjs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Téléchargement de server.cjs lancé!');
  };

  const downloadStartScript = () => {
    const batContent = `@echo off
title MediaVault - Demarrage
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         MediaVault - Demarrage           ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Verifier Node.js
echo [1/4] Verification de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe!
    echo Telecharger depuis: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo       Node.js %NODE_VERSION% detecte

:: Aller au dossier du projet
echo.
echo [2/4] Navigation vers le projet...
cd /d "%~dp0"
echo       Dossier: %CD%

:: Verifier si le serveur est deja en cours
echo.
echo [3/4] Verification du serveur...
netstat -ano | findstr :3001 >nul 2>nul
if %errorlevel% equ 0 (
    echo       Serveur deja en cours sur le port 3001
) else (
    echo       Demarrage du serveur local...
    start /min cmd /c "node server.cjs"
    timeout /t 2 /nobreak >nul
)

:: Ouvrir le navigateur
echo.
echo [4/4] Ouverture du navigateur...
timeout /t 1 /nobreak >nul
start http://localhost:3001

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║    MediaVault est pret !                 ║
echo  ║                                          ║
echo  ║    Interface: http://localhost:3001      ║
echo  ║                                          ║
echo  ║    Appuyez sur une touche pour fermer    ║
echo  ╚══════════════════════════════════════════╝
echo.
pause >nul
`;
    
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Lancer MediaVault.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Téléchargement du script de démarrage lancé!');
  };

  const downloadReadme = () => {
    const readmeContent = `════════════════════════════════════════════════════════════════
          MEDIAVAULT - GUIDE D'INSTALLATION LOCALE
════════════════════════════════════════════════════════════════

PRÉREQUIS
---------
1. Node.js (version 18 ou supérieure)
   Télécharger: https://nodejs.org/
   Choisir "LTS" (version recommandée)

ÉTAPES D'INSTALLATION
---------------------
1. Créez un dossier sur votre PC:
   Exemple: C:\\MediaVault\\

2. Placez ces fichiers dans le dossier:
   - server.cjs (le serveur)
   - Lancer MediaVault.bat (le script de démarrage)

3. IMPORTANT: Ouvrez server.cjs avec un éditeur de texte
   (clic droit > Ouvrir avec > Bloc-notes)
   
   Modifiez la ligne 21:
   const MEDIA_FOLDER = 'C:/Users/VotreNom/Pictures';
   
   Remplacez par le chemin de vos médias:
   const MEDIA_FOLDER = 'D:/Mes Photos';
   
   ATTENTION: Utilisez des / (slash) et non des \\ (antislash)

4. Double-cliquez sur "Lancer MediaVault.bat"
   
5. L'interface s'ouvre automatiquement dans votre navigateur!

DÉPANNAGE
---------
- Si rien ne se passe: vérifiez que Node.js est installé
- Si erreur "MEDIA_FOLDER introuvable": vérifiez le chemin dans server.cjs
- Si le navigateur ne s'ouvre pas: allez à http://localhost:3001

STRUCTURE RECOMMANDÉE
---------------------
C:\\MediaVault\\
├── server.cjs
├── Lancer MediaVault.bat
├── data.json (créé automatiquement)
└── dist\\ (optionnel, pour l'interface hors-ligne)

SUPPORT
-------
En cas de problème, vérifiez:
1. Node.js est installé (tapez "node -v" dans le terminal)
2. Le chemin MEDIA_FOLDER existe et contient des médias
3. Le port 3001 n'est pas utilisé par un autre programme

════════════════════════════════════════════════════════════════
`;
    
    const blob = new Blob([readmeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'README-INSTALLATION.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Téléchargement du guide lancé!');
  };

  const steps = [
    {
      number: 1,
      title: 'Installer Node.js',
      description: 'Téléchargez et installez Node.js (version LTS recommandée)',
      action: (
        <Button variant="outline" size="sm" asChild>
          <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">
            Télécharger Node.js
          </a>
        </Button>
      )
    },
    {
      number: 2,
      title: 'Créer un dossier',
      description: 'Créez un dossier sur votre PC, par exemple:',
      code: 'C:\\MediaVault',
      action: null
    },
    {
      number: 3,
      title: 'Télécharger les fichiers',
      description: 'Téléchargez et placez ces fichiers dans votre dossier:',
      action: (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={downloadServerFile} className="gap-2">
            <Download className="h-4 w-4" />
            server.cjs
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadStartScript} className="gap-2">
            <Play className="h-4 w-4" />
            Lancer MediaVault.bat
          </Button>
          <Button size="sm" variant="outline" onClick={downloadReadme} className="gap-2">
            <FileText className="h-4 w-4" />
            Guide d'installation
          </Button>
        </div>
      )
    },
    {
      number: 4,
      title: 'Configurer le chemin des médias',
      description: 'Ouvrez server.cjs avec le Bloc-notes et modifiez la ligne 21:',
      code: "const MEDIA_FOLDER = 'D:/Vos/Photos';",
      tip: 'Utilisez des / (slash) et non des \\ (antislash)',
      action: null
    },
    {
      number: 5,
      title: 'Lancer MediaVault',
      description: 'Double-cliquez sur "Lancer MediaVault.bat" - c\'est tout!',
      action: null
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête avec statut de connexion */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Server className="h-7 w-7 text-primary" />
            Installation Locale
          </h1>
          <p className="text-muted-foreground mt-1">
            Installez MediaVault sur votre PC pour accéder à vos médias locaux
          </p>
        </div>
        
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Serveur local:</span>
            {checking ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Vérification...
              </Badge>
            ) : isConnected ? (
              <Badge className="gap-1 bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Connecté
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Non connecté
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={checkConnection} disabled={checking}>
              Actualiser
            </Button>
          </div>
        </Card>
      </div>

      {/* Message si déjà connecté */}
      {isConnected && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <p className="font-medium">Serveur local actif!</p>
                <p className="text-sm text-muted-foreground">
                  Votre serveur MediaVault est connecté et fonctionne correctement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Téléchargement rapide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Téléchargement Rapide
          </CardTitle>
          <CardDescription>
            Téléchargez tous les fichiers nécessaires en un clic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={downloadServerFile} size="lg" className="h-auto py-4 flex-col gap-2">
              <Server className="h-6 w-6" />
              <span>server.cjs</span>
              <span className="text-xs opacity-70">Serveur principal</span>
            </Button>
            <Button onClick={downloadStartScript} size="lg" variant="secondary" className="h-auto py-4 flex-col gap-2">
              <Play className="h-6 w-6" />
              <span>Script de démarrage</span>
              <span className="text-xs opacity-70">Double-cliquez pour lancer</span>
            </Button>
            <Button onClick={downloadReadme} size="lg" variant="outline" className="h-auto py-4 flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span>Guide d'installation</span>
              <span className="text-xs opacity-70">Instructions détaillées</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guide étape par étape */}
      <Card>
        <CardHeader>
          <CardTitle>Guide d'Installation Pas-à-Pas</CardTitle>
          <CardDescription>
            Suivez ces étapes pour installer MediaVault sur votre PC Windows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {step.number}
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
                
                {step.code && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 font-mono text-sm">
                    <code className="flex-1">{step.code}</code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(step.code!, `step-${step.number}`)}
                    >
                      {copied === `step-${step.number}` ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
                
                {step.tip && (
                  <p className="text-xs text-amber-400/80 flex items-center gap-1">
                    ⚠️ {step.tip}
                  </p>
                )}
                
                {step.action}
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Structure de fichiers recommandée */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Structure Recommandée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center gap-2 text-amber-400">
              <HardDrive className="h-4 w-4" />
              C:\MediaVault\
            </div>
            <div className="ml-6 mt-2 space-y-1 text-muted-foreground">
              <div>├── <span className="text-green-400">server.cjs</span> <span className="text-xs opacity-50">(serveur)</span></div>
              <div>├── <span className="text-blue-400">Lancer MediaVault.bat</span> <span className="text-xs opacity-50">(démarrage)</span></div>
              <div>├── <span className="text-gray-400">data.json</span> <span className="text-xs opacity-50">(créé auto)</span></div>
              <div>└── <span className="text-gray-400">dist/</span> <span className="text-xs opacity-50">(optionnel)</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalServerDownload;
