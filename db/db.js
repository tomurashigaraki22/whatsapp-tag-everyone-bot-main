const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./main.db', (err) => {
    if (err) {
        console.error(err);
    }
    console.log("Connected to the database successfully...");
});


async function giveNewRole(name, number, role) {
    db.serialize(() => {
        db.run("CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY, name TEXT, number TEXT, role TEXT)", (err) => {
            if (err) {
                console.error("Error creating table:", err);
            } else {
                db.run("INSERT INTO roles (name, number, role) VALUES (?, ?, ?)", [name, number, role], (err) => {
                    if (err) {
                        console.error("Error inserting data:", err);
                    } else {
                        console.log(`New role added: Name: ${name} Role: ${role} Number: ${number}`);
                    }
                });
            }
        });
    });
}


async function fetchRole(number) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.get("SELECT * FROM roles WHERE number = ?", [number], (err, row) => {
                if (err) {
                    console.error(err)
                } else {
                    if (row) {
                        console.log(row)
                        resolve(row.role)
                    } else {
                        console.log("sorry nothing found")
                        resolve(null)
                    }
                }
            })
        })
    })
    
}

module.exports = {
    giveNewRole: giveNewRole,
    fetchRole: fetchRole
};
