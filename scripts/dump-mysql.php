<?php
// Dump the whole PHP/MySQL yajuter DB to JSON for Supabase migration.
// Usage: php scripts/dump-mysql.php [output.json]
// The dump contains personal diary content: NEVER commit it (see .gitignore).
require_once 'C:\\xampp\\htdocs\\yajjuter\\config.php';

$pdo = db();
$tables = [
    'users',
    'posts',
    'pilgrimage_spots',
    'pilgrimage_logs',
    'anniversaries',
    'events',
    'quotes',
    'badges',
    'badge_unlocks',
    'search_history',
    'settings',
    'post_stamps',
    'notices',
];
$out = ['dumped_at' => date('c'), 'app' => 'yajuter', 'tables' => []];
foreach ($tables as $t) {
    try {
        $rows = $pdo->query("SELECT * FROM `$t` ORDER BY 1")->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        $rows = ['__error' => $e->getMessage()];
    }
    $out['tables'][$t] = $rows;
    fwrite(STDERR, sprintf("%s: %d\n", $t, is_array($rows) ? count($rows) : -1));
}
$json = json_encode($out, JSON_UNESCAPED_UNICODE);
$dest = $argv[1] ?? null;
if ($dest) {
    // Write UTF-8 without BOM (shell redirection on Windows may emit UTF-16).
    file_put_contents($dest, $json);
    fwrite(STDERR, "wrote $dest\n");
} else {
    echo $json;
}
