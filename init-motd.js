async function saveMOTD() {
    const motd = "This is the new MOTD"; // Die MOTD, die gespeichert werden soll
    try {
        const response = await fetch('/api/motd', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: motd })
        });
        const data = await response.json();
        if (data.success) {
            console.log('MOTD successfully saved:', data.message);
        } else {
            console.error('Failed to save MOTD:', data.message);
        }
    } catch (error) {
        console.error('Error saving MOTD:', error);
    }
}

// Aufrufen der Funktion, um die MOTD zu speichern
saveMOTD();
