# INWISE Movies - Agendamento de atualizacao diaria
# Execute como Administrador: powershell -ExecutionPolicy Bypass -File setup_task.ps1

$TaskName   = "INWISE_DailyUpdate"
$ScriptPath = "C:\kind-connect-33323bce\quick_update.py"
$LogPath    = "C:\kind-connect-33323bce\task_runner.log"
$PythonExe  = (Get-Command python -ErrorAction SilentlyContinue).Source

if (-not $PythonExe) {
    Write-Error "Python nao encontrado no PATH. Verifique a instalacao."
    exit 1
}

Write-Host "Python encontrado: $PythonExe"

# Remove task antiga se existir
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# XML da task (suporta StartWhenAvailable = roda ao ligar se perdeu horario)
$xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>INWISE Movies - Atualizacao diaria do catalogo de filmes e series</Description>
    <URI>\$TaskName</URI>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>$(Get-Date -Format 'yyyy-MM-dd')T06:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
    <BootTrigger>
      <Delay>PT3M</Delay>
      <Enabled>true</Enabled>
    </BootTrigger>
  </Triggers>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <ExecutionTimeLimit>PT4H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>$PythonExe</Command>
      <Arguments>"$ScriptPath" >> "$LogPath" 2>&amp;1</Arguments>
      <WorkingDirectory>C:\kind-connect-33323bce</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

$xmlFile = "$env:TEMP\inwise_task.xml"
$xml | Out-File -FilePath $xmlFile -Encoding Unicode

Register-ScheduledTask -TaskName $TaskName -Xml (Get-Content $xmlFile -Raw) -Force | Out-Null

# Verifica
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Write-Host ""
    Write-Host "Task criada com sucesso!" -ForegroundColor Green
    Write-Host "  Nome   : $TaskName"
    Write-Host "  Horario: Todo dia as 06:00"
    Write-Host "  Startup: Sim (roda 3min apos ligar o PC se perdeu o horario)"
    Write-Host "  Log    : $LogPath"
    Write-Host "  Resumo : C:\kind-connect-33323bce\update_summary.log"
    Write-Host ""
    Write-Host "Para rodar agora e testar:"
    Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
} else {
    Write-Error "Falha ao criar a task. Execute como Administrador."
}
