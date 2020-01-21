const connection = require('../configs/db')

module.exports = {
    auth: (user_id) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT a.id, a.name, a.email, a.role_id, b.avatar FROM user a, engineer b
            WHERE a.id = '${user_id}'
            AND b.user_id = '${user_id}'`, (error, result) => {
                if (error) {
                    reject(new Error(error))
                } else {
                    resolve(result)
                }
            })
        })
    },
    login: (email) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT * FROM user WHERE email = ?`, email, (error, result) => {
                if (error) {
                    reject(new Error(error))
                } else {
                    resolve(result)
                }
            })
        })
    },
    register: (data) => {
        return new Promise((resolve, reject) => {
            connection.query('INSERT INTO user SET ?', data, (error, result) => {
                if (error) {
                    reject(new Error(error))
                } else {
                    resolve(result)
                }
            })
        })
    },
    checkUser: (email) => {
        return new Promise((resolve, reject) => {
            connection.query(`SELECT email FROM user WHERE email = '${email}'`, (error, result) => {
                if (error) {
                    reject(new Error(error))
                } else {
                    resolve(result)
                }
            })
        })
    }
}
