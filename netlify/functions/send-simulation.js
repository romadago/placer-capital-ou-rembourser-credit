// Fichier : netlify/functions/send-simulation.js
// Mis à jour pour gérer le simulateur "Rembourser vs Placer"

const { Resend } = require('resend');

// --- Helper function to format the main body of the email based on the theme ---
function getEmailBody(theme, data) {
    const { objectifs, resultats } = data;
    const commonFooter = `
        <p style="margin-top: 25px;">Pour une analyse complète et des conseils adaptés à votre situation, n'hésitez pas à nous contacter.</p>
        <br>
        <p>Cordialement,</p>
        <p><strong>L'équipe Aeternia Patrimoine</strong></p>
    `;

    // --- Cas Spécial : Simulateur "Rembourser vs Placer" ---
    if (theme === 'Rembourser vs Placer') {
        return `
            <p>Merci d'avoir utilisé notre simulateur. Voici le résumé de votre comparatif "Rembourser le crédit vs. Placer le capital" :</p>
            <h3 style="color: #333;">Vos paramètres :</h3>
            <ul style="list-style-type: none; padding-left: 0; border-left: 3px solid #00FFD2; padding-left: 15px;">
                <li><strong>Capital disponible (et/ou restant dû) :</strong> ${objectifs.capital}</li>
                <li><strong>Durée restante du crédit :</strong> ${objectifs.duree}</li>
                <li><strong>Taux du crédit :</strong> ${objectifs.tauxCredit}</li>
            </ul>

            <h3 style="color: #333;">Comparatif du patrimoine final estimé :</h3>
            
            <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">
                <tr style="background-color: #f7f7f7;">
                    <td style="border: 1px solid #ddd; padding: 12px;">
                        <strong style="color: #4338ca;">Option 1 : Rembourser le crédit</strong><br>
                        <small>Puis placer la mensualité de ${resultats.mensualite.toFixed(0)} €</small>
                    </td>
                    <td style="border: 1px solid #ddd; padding: 12px;">
                        <strong style="color: #00877a;">Option 2 : Placer le capital</strong><br>
                        <small>Et continuer de payer le crédit</small>
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 12px;">
                        <strong>À 4% :</strong> ${resultats.patrimoineRemboursement4.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                    </td>
                    <td style="border: 1px solid #ddd; padding: 12px;">
                        <strong>À 4% :</strong> ${resultats.patrimoinePlacement4.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                    </td>
                </tr>
                 <tr style="background-color: #f0f0f0;">
                    <td style="border: 1px solid #ddd; padding: 12px;">
                        <strong>À 6% :</strong> ${resultats.patrimoineRemboursement6.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                    </td>
                    <td style="border: 1px solid #ddd; padding: 12px;">
                        <strong>À 6% :</strong> ${resultats.patrimoinePlacement6.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}
                    </td>
                </tr>
            </table>
            <p style="margin-top: 15px; font-size: 14px; text-align: center;">Gain en remboursant immédiatement (intérêts économisés) : <strong>~${resultats.interetsEconomises.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</strong></p>
            ${commonFooter}
        `;
    }
    
    // ... (ici, les autres templates pour les autres simulateurs) ...

    return `<p>Merci d'avoir utilisé nos services.</p>${commonFooter}`;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = JSON.parse(event.body);
    const { email, data, theme = 'default' } = body;

    if (!data) {
        throw new Error("Données de simulation manquantes.");
    }
    
    const emailSubjects = {
        'Rembourser vs Placer': "Votre comparatif : Rembourser votre crédit ou Placer votre capital ?",
        // ... (autres sujets)
        'default': `Votre simulation Aeternia Patrimoine`
    };

    const subject = emailSubjects[theme] || emailSubjects['default'];
    const emailBodyHtml = getEmailBody(theme, data);

    await resend.emails.send({
      from: 'Aeternia Patrimoine <contact@aeterniapatrimoine.fr>', 
      to: [email],
      bcc: ['contact@aeterniapatrimoine.fr'],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #333;">Bonjour,</h2>
          ${emailBodyHtml}
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
    console.error("Erreur dans la fonction Netlify :", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Une erreur est survenue lors de l'envoi de l'email." }),
    };
  }
};
