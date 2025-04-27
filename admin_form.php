<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Newsletter</title>
    <link rel="stylesheet" href="back_office.css" />
    <link rel="stylesheet"href="admin.css">
    
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
    />
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  </head>
  <body>
    <aside class="sidebar">
      <header class="sidebar-header">
        <a href="#" class="header-logo">
          <img
            src="https://i.ibb.co/353xL40D/helpmeout-logo-transparent-Copie.png"
          /> </a
        ><button class="toggler sidebar-toggler">
          <span class="material-symbols-rounded">chevron_left</span>
        </button>
      </header>

      <nav class="sidebar-nav">
        <ul class="nav-list primary-nav">
          <li class="nav_item">
            <a href="back_office.html" class="nav_link">
              <span class="material-symbols-rounded">dashboard</span>
              <span class="nav-label">Tableau de Bord</span>
            </a>
          </li>
          <li class="nav_item">
            <a href="#" class="nav_link">
              <span class="material-symbols-rounded"
                ><span class="material-symbols-rounded">
                  supervisor_account
                </span></span
              >
              <span class="nav-label">Gestion des Utilisateurs</span>
            </a>
          </li>
          <li class="nav_item">
            <a href="#" class="nav_link">
              <span class="material-symbols-rounded">settings</span>
              <span class="nav-label">Paramètre</span>
            </a>
          </li>
          <li class="nav_item">
            <a href="admin_form" class="nav_link">
              <span class="material-symbols-rounded">mail</span>
              <span class="nav-label">Newsletter</span>
            </a>
          </li>
        </ul>
        <ul class="nav-list secondary-nav">
          <li class="nav_item">
            <a href="#" class="nav_link">
              <span class="material-symbols-rounded">login</span>
              <span class="nav-label">Déconnexion</span>
            </a>
          </li>
          <li class="nav_item">
            <a href="#" class="nav_link">
              <span class="material-symbols-rounded">person</span>
              <span class="nav-label">Profil</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>

    <main class="main-content">
        <header>
            <div class="admin-content">
            <div class="admin-info">
                <img src="https://dummyimage.com/50x50/000/fff" alt="" class="profile-image">
                <div class="admin-info-text">
                    <h1>Admin</h1>
                    <p>admin@helpmeout.com</p>
                </div>
            </div>
            <h1 class="page-title">Back Office HelpMeOut</h1>
            
        </div>
        <hr>
        <script src="back.js"></script>
        </header>


<form method="post" action="">
    <label>Titre :</label>
    <input type="text" name="titre" required>

    <label>Contenu :</label>
    <textarea name="contenu" required></textarea>

    <button class="creer" type="submit">Créer et envoyer</button>
    <?php require 'traitement_newsletter.php';?>
</form>
