<?php
$dataSourceName = "mysql:host=localhost;dbname=esgi";
$username  ="root";
$password="root";

$bdd = new PDO(
    $dataSourceName,
    $username,
    $password
);

define('PasswordGmail', 'icqu holg zqkh nlgq');


try{
    $bdd->setAttribute(pdo::ATTR_ERRMODE,pdo::ERRMODE_EXCEPTION);
}catch(Exception $e){
    die("erreur de connexion base de donnée". $e->getMessage());

}

?>
