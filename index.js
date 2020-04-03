const express = require('express')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const session = require('express-session')
const jwt = require('jsonwebtoken')

const app = express()

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

const port = 5000;

const secretKey = 'thisisverysecretkey'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

const db = mysql.createConnection({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '',
    database: "antripasien"
})

const isAuthorized = (request, result, next) => {
    // cek apakah user sudah mengirim header 'x-api-key'
    if (typeof(request.headers['x-api-key']) == 'undefined') {
        return result.status(403).json({
            success: false,
            message: 'Unauthorized. Token is not provided'
        })
    }

    // get token dari header
    let token = request.headers['x-api-key']

    // melakukan verifikasi token yang dikirim user
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return result.status(401).json({
                success: false,
                message: 'Unauthorized. Token is invalid'
            })
        }
    })

    // lanjut ke next request
    next()
}

//mencocokkan username dan password yang ada di database
app.post('/login/admin', function(request, response) {
    let data = request.body
	var username = data.username;
	var password = data.password;
	if (username && password) {
		db.query('SELECT * FROM akun WHERE username= ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = data.username;
				response.redirect('/login/admin');
			} else {
				response.send('Username dan/atau Password salah!');
			}			
			response.end();
		});
	} else {
		response.send('Masukkan Username and Password!');
		response.end();
	}
});


app.get('/login/admin', function(request, results) {
	if (request.session.loggedin) {
        let data = request.body
        let token = jwt.sign(data.username + '|' + data.password, secretKey)

        results.json({
            success: true,
            message: 'Login success, welcome back Admin!',
            token: token
        })
	} else {
        results.json({
            success: false,
            message:'Mohon login terlebih dahulu!'
        })
        }
	
	results.end();
});

//mencocokkan username dan password yang ada di database
app.post('/login/pasien', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		db.query('SELECT * FROM pasien WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = username;
				response.redirect('/home');
			} else {
				response.send('Username dan/atau Password salah!');
			}			
			response.end();
		});
	} else {
		response.send('Masukkan Username and Password!');
		response.end();
	}
});


app.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.send('Selamat Datang Pasien, ' + request.session.username + '!');
	} else {
		response.send('Mohon login terlebih dahulu!');
	}
	response.end();
});


/************* CRUD PASIEN ****************/
// endpoint menampilkan data pasien dengan menggunakan token
app.get('/pasien', isAuthorized, (req, res)=>{
    let sql = `
        select nama, created_at from pasien
    `

    db.query(sql, (err, result)=>{
        if (err) throw err
        res.json({
            message: "success get all pasien",
            data: result
        })
    })
})

// endpoint menambahkan data pasien dengan menggunakan token
app.post('/pasien',isAuthorized, (req, res) => {
    let data = req.body
    let sql = `
        insert into pasien (username, password, nama, alamat, telepon)
        values ('`+data.username+`','`+data.password+`','`+data.nama+`', '`+data.alamat+`', '`+data.telepon+`')`

    db.query(sql, (err, result)=>{
        if (err) throw err
        res.json({
            message: 'data pasien created',
            data: result
        })
    })
})

// endpoint menampilkan data pasien dengan id menggunakan token
app.get('/pasien/:id', isAuthorized, (req, res)=>{
    let sql = `
        select * from pasien
        where id = `+req.params.id+`
        limit 1`

    db.query(sql, (err, result)=>{
        if (err) throw err
        res.json({
            message: 'Success get pasien detail',
            data: result[0]
        })
    })
})

// endpoint mengubah data pasien dengan id menggunakan token
app.put('/pasien/:id', isAuthorized, (req, res)=>{
    let data = req.body

    let sql = `
        update pasien
        set username = '`+data.username+`', password = '`+data.password+`', nama = '`+data.nama+`', 
        alamat = '`+data.alamat+`', telepon = '`+data.telepon+`'
        where id = '`+req.params.id+`'
        `
    db.query(sql, (err, result)=>{
        if (err) throw err
        res.json({
            message: 'Data pasien has been update',
            data: result
        })
    })
})

// endpoint menghapus data pasien dengan id menggunakan token
app.delete('/pasien/:id', isAuthorized, (req, res)=>{
    let sql = `
        delete from pasien
        where id ='`+req.params.id+`'
    `
    db.query(sql, (err, result)=>{
        if  (err) throw err
        res.json({
            message: ' Data pasien has been deleted',
            data: result
        })
    })
})

/************* CRUD Kartu ***************/
// endpoint menampilkan data kartu menggunakan token
app.get('/kartu', isAuthorized, (req, res)=>{
    let sql = `
        select no_rekam_medis, nama_pasien, stock, created_at from kartu
    `
    db.query(sql, (err, result)=>{
        if (err) throw err
        res.json({
            message: 'Success get all kartu',
            data: result
        })
    })
})

// endpoint menambahkan data kartu menggunakan token
app.post('/kartu', isAuthorized, (req, res)=>{
    let data = req.body
    let sql = `
        insert into kartu( no_rekam_medis, nama_pasien, stock)
        values( '`+data.nomor_urut+`', '`+data.nama_pasien+`', '`+data.stock+`')`

    db.query(sql, (err, result)=>{
        if (err) throw err
        res.json({
            message: 'kartu created!',
            data: result
        })
    })
})

// endpoint menampilkan data kartu dengan id menggunakan token
app.get('/kartu/:id', isAuthorized, (req, res)=>{
    let sql = `
        select * from kartu
        where id = `+req.params.id+`
        limit 1
    `
    db.query(sql, (err, result)=>{
        if (err) throw err
        res.json({
            message: 'Success get kartu detail',
            data: result[0]
        })
    })
})

// endpoint edit data kartu dengan id menggunakan token
app.put('/kartu/:id', isAuthorized, (req, res) => {
    let data = req.body

    let sql = `
        update kartu
        set no_rekam_medis = '`+data.no_rekam_medis+`', nama_pasien = '`+data.nama_pasien+`', stock = '`+data.stock+`'
        where id = `+req.params.id+`
        `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            success: true,
            message: 'Data kartu has been update!',
            data: result
        })
    })
})

// endpoint hapus data kartu dengan id menggunakan token
app.delete('/kartu/:id', isAuthorized, (req, res) => {
    let sql = `
        delete from kartu 
        where id = `+req.params.id+`
    `

    db.query(sql, (err, result) => {
        if (err) throw err
        res.json({
            success: true,
            message: 'Data kartu has been delete!',
            data: result
        })
    })
})

/********* TRANSAKSI **************/
// endpoint post data kartu dengan id bisa menambahkan dan 
// mengubah data kartu menggunakan token
app.post('/kartu/:id/kunjungan', (req, res) => {
    let data = req.body

    db.query(`
        insert into pasien_kartu (pasien_id, kartu_id)
        values ('`+data.user_id+`', '`+req.params.id+`')
    `, (err, result) => {
        if (err) throw err
    })

    db.query(`
        update kartu
        set stock = stock - 1
        where id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err
    })

    res.json({
        message: "Kartu kunjungan pasien selesai"
    })
})

// endpoint menampilkan(get) data pasien right join data kartu
// dengan id menggunakan token
app.get('/pasien/:id/kartu', (req, res) => {
    db.query(`
        select kartu.no_rekam_medis, kartu.nama_pasien, kartu.stock
        from pasien
        right join pasien_kartu on pasien.id = pasien_kartu.pasien_id
        right join kartu on pasien_kartu.kartu_id = kartu.id
        where pasien.id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "success get user's kartu kunjungan",
            data: result
        })
    })
})



// endpoint menghapus data transaksi
app.delete('/kartu/:id/delete', isAuthorized, (req, res) => {
    let data = req.body
    db.query(`
        delete from pasien_kartu
        where id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err
    })
    db.query(`
        update kartu
        set stock = stock + 1
        where id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err
    })
    res.json({
        message: "Kartu has been delete by pasien"
    })
})

/********** Run Application **********/
app.listen(port, () => {
    console.log('App running on port ' + port)
})