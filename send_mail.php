<?php
require('fpdf186/fpdf.php'); 
require('PHPMailer-master/src/PHPMailer.php');
require('PHPMailer-master/src/SMTP.php');
require('PHPMailer-master/src/Exception.php');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function envoyerEmail($destinataire, $titre, $contenu) {
    $mail = new PHPMailer(true);

    try {
        // Configuration du serveur SMTP
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com'; 
        $mail->SMTPAuth = true;
        $mail->Username = 'news.helpmeout@gmail.com'; // ton email SMTP
        $mail->Password = PasswordGmail ;       // ton mot de passe SMTP
        $mail->SMTPSecure = 'ssl'; // ou 'ssl' selon ton serveur
        $mail->Port = 465; // souvent 587 pour TLS, 465 pour SSL


        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        

        // Destinataires
        $mail->setFrom('news.helpmeout@gmail.com', 'HelpMe Out');
        $mail->addAddress($destinataire);

        // Contenu du mail
        $mail->isHTML(true);
        $mail->Subject = $titre;
        $mail->Body = $contenu;

        $mail->send();
        // Contenu de ta newsletter
        $pdf = new FPDF();
        $pdf->AddPage();
        $pdf->SetFont('Roboto','',16);

        // Ajoute le contenu
        $pdf->MultiCell(0,10,"Newsletter du " . date('d/m/Y') . $contenu);

        // Dossier où sauvegarder
        if (!is_dir('newsletters')) {
            mkdir('newsletters', 0777, true);
        }

        $fileName = 'newsletters/newsletter-' . date('Y-m-d-') . '.pdf';
        $pdf->Output('F', $fileName);

    } catch (Exception $e) {
        // Gestion d'erreur
        error_log("Erreur envoi email : " . $mail->ErrorInfo);
        return false;
    }
}


?>



