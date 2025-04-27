<?php require "config.php"; ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="news.css">
    <title>Document</title>
</head>
<body>
<?php 
require('PHPMailer-master/src/PHPMailer.php');
require('PHPMailer-master/src/SMTP.php');
require('PHPMailer-master/src/Exception.php');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$email = '';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    if (isset($_POST['email']) && !empty($_POST['email'])) {

        $email = htmlspecialchars($_POST['email']);

        // Vérifier si l'utilisateur est déjà inscrit à la newsletter
        $requete = $bdd->prepare("SELECT mail FROM utilisateur WHERE mail = :mail AND newsletter = 1");
        $requete->execute([':mail' => $email]);
        $EmailExist = $requete->fetch();

        $requete = $bdd->prepare("SELECT mail FROM utilisateur WHERE mail = :mail ");
        $requete->execute([':mail' => $email]);
        $userExist = $requete->fetchAll();


        if(!$userExist){
            echo '<div class="status-message error">Vous devez être inscrit à HelpMeOut !</div>';
        }

        if($userExist){

         if ($EmailExist) {
            echo '<div class="status-message error">Vous êtes déjà inscrit !</div>';
        } else {
            // Mettre à jour pour inscrire à la newsletter
            $requete = $bdd->prepare("UPDATE utilisateur SET newsletter = 1 WHERE mail = :mail");
            $requete->execute([':mail' => $email]);

            echo '<div class="status-message succes">Vous êtes inscrit à la newsletter !</div>';
               
    $mail = new PHPMailer(true);

    try {
        // Paramètres SMTP Gmail
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'news.helpmeout@gmail.com';
        $mail->Password   = PasswordGmail ; // mot de passe d'application dispo dans config
        $mail->SMTPSecure = 'ssl'; 
        $mail->Port       = 465; 
    
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
    
      
        $mail->setFrom('news.helpmeout@gmail.com', 'HelpMeOut');
        $mail->addAddress($email);
    
       
        $mail->isHTML(true);
        $mail->Subject = 'Test envoi avec Gmail SMTP';
        $mail->Body    = '<h1>Ça fonctionne !</h1><p>Ceci est un test</p>';
    
        $mail->send();
        echo 'Message envoyé!';
    } catch (Exception $e) {
        echo "Erreur : {$mail->ErrorInfo}";
    }
    
    
        }

    }
}
}

?>
</body>
</html>







