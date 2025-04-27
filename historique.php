<?php

require 'traitement_newsletter.php';
$files = glob('newsletters/*.pdf');
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Historique des Newsletters</title>
</head>
<body>
    <h1>Historique des Newsletters</h1>
    <?php
    if ($files) {
       
        rsort($files);
        
        foreach ($files as $file) {
            $filename = basename($file);
            $date = date('d/m/Y', filemtime($file));
            echo "<li><a href='$file'>$filename</a> (créé le $date)</li>";
        }
    } else {
        echo "<p>Aucune newsletter enregistrée pour le moment.</p>";
    }
    ?>
</body>
</html>
