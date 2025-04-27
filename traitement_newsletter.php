<?php
require 'config.php';
require_once 'send_mail.php';

if($_SERVER["REQUEST_METHOD"]==="POST"){

if (isset($_POST['titre']) && isset($_POST['contenu'])) {
    $titre = $_POST['titre'];
    $contenu = $_POST['contenu'];


    // Charge le template
    $template = file_get_contents('email/create_template.php');

    // Remplace les balises
    $template = str_replace('{{titre}}', $titre, $template);
    $template = str_replace('{{contenu}}', nl2br($contenu), $template);

    // Sélectionne les utilisateurs inscrits à la newsletter
    $destinataire = $bdd->query("SELECT mail FROM Utilisateur WHERE newsletter = 1")->fetchAll(PDO::FETCH_ASSOC);



    foreach ($destinataire as $utilisateur) {
        envoyerEmail($utilisateur['mail'], "Newsletter HelpMe Out - $titre", $template);
    }

    echo "Newsletter envoyée avec succès !";
}
}
?>