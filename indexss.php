
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <!-- <link rel="stylesheet" href="style.css" /> -->
    <link rel="stylesheet" href="try.css">
    <link rel="icon" type="image/x-icon" href="favicon.ico">
    <title>HelpMeOut</title>
  </head>
  <body>
    <header>
      <nav class="navbar">
        <!-- <a href="" class="logo">LOGO<span>.</span></a> -->
        <img src="./Images/logo/helpmeout_logo_transparent.png" alt="HelpMeOut Logo" class="logo" />
        <div class="flex-links">
          <ul class="menu-links">
            <span id="close-menu-btn"><i class="fa fa-times"></i></span>
            <li><a href="#">Home</a></li>
            <li><a href="#">A Propos</a></li>
            <li><a href="#">Service</a></li>
          </ul>
          <button class="btn">Connnexion</button>
        </div>
        <span id="hamburger-btn"><i class="fa fa-bars"></i></span>
      </nav>
    </header>

    <div class="container">
      <div class="content-2">
        <img src="./Images/Illustration.png" alt="" class="small-image" />
      </div>
      <div class="content">
        <h1>Simplifiez vos tâches du quotidien</h1>
        <p>
          HelpMeOut permet aux utilisateurs de publier et de postuler à des
          petits services à domicile, comme le montage de meubles ou l’aide au
          déménagement. Trouvez rapidement une solution à vos besoins ponctuels,
          avec un échange sécurisé et rémunéré.
        </p>
        <button class="service-button">Demander un Services</button>
      </div>
    </div>

    <div class="slider" style="  
    --width: 100px;
    --height: 50px;
    --quantity: 10;">
      <div class="list">
        <div class="item" style="--position: 1"><img src="./images/slider/slider1_1.png" alt=""></div>
        <div class="item" style="--position: 2"><img src="./images/slider/slider1_2.png" alt=""></div>
        <div class="item" style="--position: 3"><img src="./images/slider/slider1_3.png" alt=""></div>
        <div class="item" style="--position: 4"><img src="./images/slider/slider1_4.png" alt=""></div>
        <div class="item" style="--position: 5"><img src="./images/slider/slider1_5.png" alt=""></div>
        <div class="item" style="--position: 6"><img src="./images/slider/slider1_6.png" alt=""></div>
        <div class="item" style="--position: 7"><img src="./images/slider/slider1_7.png" alt=""></div>
        <div class="item" style="--position: 8"><img src="./images/slider/slider1_8.png" alt=""></div>
        <div class="item" style="--position: 9"><img src="./images/slider/slider1_9.png" alt=""></div>
        <div class="item" style="--position: 10"><img src="./images/slider/slider1_10.png" alt=""></div>
      </div>
    </div>

    <div class="slider" reverse="true" style="  
    --width: 200px;
    --height: 200px;
    --quantity: 9;">
      <div class="list">
        <div class="item" style="--position: 1"><img src="./images/slider/slider2_1.png" alt=""></div>
        <div class="item" style="--position: 2"><img src="./images/slider/slider2_2.png" alt=""></div>
        <div class="item" style="--position: 3"><img src="./images/slider/slider2_3.png" alt=""></div>
        <div class="item" style="--position: 4"><img src="./images/slider/slider2_4.png" alt=""></div>
        <div class="item" style="--position: 5"><img src="./images/slider/slider2_5.png" alt=""></div>
        <div class="item" style="--position: 6"><img src="./images/slider/slider2_6.png" alt=""></div>
        <div class="item" style="--position: 7"><img src="./images/slider/slider2_7.png" alt=""></div>
        <div class="item" style="--position: 8"><img src="./images/slider/slider2_8.png" alt=""></div>
        <div class="item" style="--position: 9"><img src="./images/slider/slider2_9.png" alt=""></div>
      </div>
    </div>

    <div class="services-container">
      <div class="section-header">
        <h2 class="section-title">Services</h2>
        <p class="section-description">Sur HelpMeOut, nous proposons une gamme de services pour faciliter les tâches à domicile et répondre à vos besoins ponctuels. Ces services incluent:</p>
      </div>


      <div class="card-container">
        <div class="card card-light">
          <h3 class="card-title">Montage de meubles</h3>
          <a href="#" class="card-icon">
            <div class="card-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span>En savoir plus</span>
          </a>
        </div>

        <div class="card card-orange">
          <h3 class="card-title">Aide au déménagement</h3>
          <a href="#" class="card-icon">
            <div class="card-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span>En savoir plus</span>
          </a>
        </div>


        <div class="card card-dark">
          <h3 class="card-title">Réparation d'appareils électroménagers</h3>
          <a href="#" class="card-icon">
            <div class="card-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span>En savoir plus</span>
          </a>
        </div>


        <div class="card card-light">
          <h3 class="card-title">Cours Particuliers</h3>
          <a href="#" class="card-icon">
            <div class="card-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span>En savoir plus</span>
          </a>
        </div>
        
        <div class="card card-orange">
          <h3 class="card-title">Content Creation</h3>
          <a href="#" class="card-icon">
            <div class="card-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span>En savoir plus</span>
          </a>
        </div>
        
        <div class="card card-dark">
          <h3 class="card-title">Petits travaux de bricolage</h3>
          <a href="#" class="card-icon">
            <div class="card-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <span>En savoir plus</span>
          </a>
        </div>
        
      
      
      
    </div>
    <div class="cta-section">
      <h3 class="cta-title">Passons à l'action</h3>
      <p class="cta-text">Contactez-nous dès aujourd'hui pour discuter de la manière dont nos services peuvent vous aider à accomplir vos tâches à domicile plus efficacement.</p>
      <a href="#" class="cta-button">Lancez-vous dès aujourd'hui</a>
    </div>
    </div>
    <script src="script.js"></script>
    <main>
    <section class="form">
      <h2>Contactez Nous </h2>
      <form method="post">
          <section class="check">
          <input type = "checkbox" id="faq" name="faq">
          <label for="faq">FAQ</label>
          <input type = "checkbox" id="support" name="support">
          <label for="support">Service Support</label>
      </section>
      <section class="mess">
          <label for="name">Nom</label>
          <input type = "text" id="name" name="name" required placeholder="Nom">
          <label for="mail">Email</label>
          <input type = "email" id="mail" name="mail" required placeholder="Email">
          <label for="message">Message</label>
          <textarea type = "message" id="message" name="message" required placeholder=""> </textarea>
          <button class = "envoie">Envoyer</button>
         
      </section>
         
      </form>
  </section>
</main>
    <footer>

   
    
    </section>
    <section class = "link">
        <ul>
            <section class = "helpmeout">
                <li><img src = "nesaispas" alt="HelpMeOut Logo" width="140" height="90"></a></li>
                
            </section>
            <li><a href = "apropos.php">A Propos</a></li>
            <li><a href = "services.php">Services</a></li>
            <section class="logor">
            <li><i class="fa-brands fa-instagram fa-2x"></i></li>
            <li><i class="fa-brands fa-linkedin fa-2x"></i></a></li>
            <li><i class="fa-brands fa-facebook fa-2x"></i></li>
        </section>
        </ul>
    </section>
            <section class="contact">
                <ul>
            <li><h2>Contact  </h2></li>
            <li> Email : info@helpmeout.com</li>
            <li>Téléphone : 555-567-8901</li>
            <li>Adresse : 240 Faubourg Saint-Antoine 75012</li>
        </ul>
        </section>
        
    </section>
   
    <section class="news">
    <?php require 'traitement.php';?>
        <form method="POST" >
        
            <input id = "email" type = "email" placeholder="Email" name = "email">
            <button class = "sub"type = "submit">Abonnement à la Newsletter</button>
            
        </form>
       
    </section>
    <div class="footer-bottom">
        <p>© 2025 HelpMeOut. All Rights Reserved.</p>
      
    </div>
</footer>
  </body>
</html>
