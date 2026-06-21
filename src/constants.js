export const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min';
export const LANG_ID    = 'scratchpiler';
export const LS_KEY     = 'scratchpiler-content';
export const LS_INJ_KEY = 'scratchpiler-injected'; // persisted top-level hat block IDs per sprite

export const KEYWORDS = [
    // Control flow
    'on','if','else','forever','repeat','until','while','for','from','wait','define','pyfor','in',
    // Operators
    'and','or','not','mod',
    // Hat events
    'flag','click','clone','receive','backdrop',
    // Variable ops (keep space-form)
    'set','change','to','by',
    // Motion
    'move','turnRight','turnLeft','goTo','glide','bounce',
    'setX','setY','changeX','changeY','setRotationStyle',
    // Looks
    'say','sayFor','think','thinkFor',
    'switchCostume','switchBackdrop','switchBackdropAndWait','nextCostume','nextBackdrop',
    'setSize','changeSize','show','hide','clearEffects',
    // Sound
    'play','playUntilDone','stopSounds',
    'setSoundEffect','changeSoundEffect','clearSoundEffects',
    // Events
    'broadcast','broadcastAndWait',
    // Control statements
    'stopAll','stopThis','stopOtherScripts','createClone','deleteClone',
    // Data
    'showVariable','hideVariable','showList','hideList',
    'listAdd','listDelete','listInsert','listReplace','listDeleteAll',
    // Sensing
    'setDragMode',
    // Reporters
    'xPos','yPos','direction','costumeNum','costumeName',
    'timer','mouseDown','mouseX','mouseY','loudness','answer',
    'volume','username','daysSince2000',
    // Sensing (expression context)
    'touching','key',
    // Motion extras
    'setDirection','turnTo','pointTowards','goToFront','goToBack','moveForward','moveBackward',
    // Looks extras
    'setEffect','changeEffect',
    // Sound extras
    'setVolume','changeVolume',
    // Sensing extras
    'askAndWait','resetTimer',
    // Ergonomic aliases
    'print','println','step','forward','left','right',
    'append','push','pop','remove','insert','replace','clear',
    'front','back','stopMe','ask','send','sendAndWait',
    // else-if alias
    'elif',
    // Scratchroutines
    'scratchroutine','launch','await','cancel','isRunning','checkCancel',
    // Struct declarations and debug
    'struct','breakpoint',
    // Enum declarations
    'enum','enums',
];
