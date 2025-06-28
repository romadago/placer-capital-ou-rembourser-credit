// Fichier : netlify/functions/send-simulation.js
// Version corrigée et étendue pour gérer tous les thèmes de simulateurs

const { Resend } = require('resend');

const emailTemplates = {
    'default': {
        subject: `Votre simulation d'épargne Aeternia Patrimoine`,
        title: "le résumé de votre simulation",
        objectiveLabel: "Revenu mensuel souhaité",
    },
    'Aider un proche': {
        subject: `Votre simulation pour aider un proche`,
        title: "le résumé de votre projet d'aide financière",
        objectiveLabel: "Aide mensuelle à verser",
    },
    'Études enfant': {
        subject: `Votre simulation pour les études de votre enfant`,
        title: "le résumé de votre projet pour les études de votre enfant",
        objectiveLabel: "Revenu mensuel pour ses études",
    },
    'Retraite': {
        subject: `Votre simulation de retraite complémentaire`,
        title: "le résumé de votre projet de retraite",
        objectiveLabel: "Revenu mensuel souhaité à la retraite",
    },
    'Année sabbatique': {
        subject: `Votre simulation pour votre année sabbatique`,
        title: "le résumé de votre projet d'année sabbatique",
        objectiveLabel: "Budget mensuel nécessaire",
    },
};


exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = JSON.parse(event.body);
    
    const { email, data, theme } = body;

    // --- Contrôle de sécurité des données ---
    if (!data || typeof data.objectifs === 'undefined' || typeof data.resultats === 'undefined') {
        console.error("Données de simulation manquantes ou mal formatées :", body);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Données de simulation invalides." }),
        };
    }
    
    const { objectifs, resultats } = data;

    const template = emailTemplates[theme] || emailTemplates['default'];

    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: template.subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #333;">Bonjour,</h2>
          <p>Merci d'avoir utilisé notre simulateur. Voici ${template.title} :</p>
          
          <h3 style="color: #333;">Vos paramètres :</h3>
          <ul style="list-style-type: none; padding-left: 0; border-left: 3px solid #00FFD2; padding-left: 15px;">
            <li><strong>${template.objectiveLabel} :</strong> ${objectifs.revenuRecherche}</li>
            <li><strong>Durée de l'épargne :</strong> ${objectifs.dureePlacement}</li>
            <li><strong>Votre apport initial :</strong> ${objectifs.versementInitial}</li>
          </ul>

          <h3 style="color: #333;">Résultats de votre projet :</h3>
          <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 16px;">Pour atteindre votre objectif, votre effort d'épargne mensuel suggéré est de :</p>
              <p style="font-size: 24px; font-weight: bold; color: #00877a; margin: 10px 0;">${resultats.versementMensuelRequis} / mois</p>
              <p style="font-size: 14px; color: #555; margin: 0;">Cet effort vous permettrait de viser un capital final de <strong>${resultats.capitalVise}</strong>.</p>
          </div>
          
          <p style="margin-top: 25px;">Pour discuter de ces résultats et mettre en place la stratégie la plus adaptée, n'hésitez pas à nous contacter.</p>
          <br>
          <p>Cordialement,</p>
          <p><strong>L'équipe Aeternia Patrimoine</strong></p>

          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
          
          <p style="font-size: 10px; color: #777; text-align: center; margin-top: 20px;">
            Les informations et résultats fournis par ce simulateur sont donnés à titre indicatif et non contractuel. Ils sont basés sur les hypothèses de calcul et les paramètres que vous avez renseignés et ne constituent pas un conseil en investissement.
          </p>
        </div>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email envoyé avec succès !' }),
    };

  } catch (error) {
    console.error("Erreur dans la fonction Netlify :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Une erreur est survenue lors de l'envoi de l'email." }),
    };
  }
};