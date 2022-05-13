const express = require('express');

const env = process.env.NODE_ENV || 'development'
const config = require('../../knexfile')[env]
const knex = require('knex')(config)

const router = express.Router();

/*
{
  Headers: Token
  Body:{
    email,
    office_id,
    first_name,
    last_name
  }

}
*/
router.post('/', async (req, res) => {
  const token = req.kauth.grant.access_token.content;
  let newUser;
  let existingUser;
  if(Object.keys(req.body).length === 0){
    existingUser = await knex('users').select('*').where({email: token.email})
    if(existingUser.length !== 0 && existingUser[0].id === null){
      knex('users')
        .where({email: token.email})
        .update({id: token.sub, first_name: token.given_name, last_name: token.family_name}, ['*'])
        .then(data => res.status(201).json(data[0]))
        .catch(() => res.sendStatus(500))
    } else if(existingUser.length !== 0 && existingUser[0].id !== null) {
      res.sendStatus(401)
    } else{
      newUser = {
        id: token.sub,
        email: token.email,
        first_name: token.given_name,
        last_name: token.family_name,
        is_admin: false,
        is_editor: false,
        office_id: null,
        is_deleted: false
      }
      knex('users')
        .insert(newUser, ['*'])
        .then(data => res.status(201).json(data[0]))
        .catch(() => res.sendStatus(500))
    }
  } else {
    const { email, first_name, last_name, office_id } = req.body
    existingUser = await knex.select('*').from('users').where({email: email})
    if(existingUser.length !== 0){
      knex('users')
        .where({email: email})
        .update({office_id: office_id}, ['*'])
        .then(data => res.status(201).json(data[0]))
        .catch(() => res.sendStatus(500))
    } else {
      newUser = {
        id: null,
        email: email,
        first_name: first_name,
        last_name: last_name,
        is_admin: false,
        is_editor: false,
        office_id: office_id,
        is_deleted: false
      }
      knex('users')
        .insert(newUser, ['*'])
        .then(data => res.status(201).json(data[0]))
        .catch(() => res.sendStatus(500))
    }
  }
});

// TODO: CHANGE USER EMAIL TO ID OF TOKEN
// TODO: CREATE GET ROUTE FOR /my-account
// router.get('/:user_id', (req, res) =>{
//   const { user_id } = req.params;

//   knex.select('*').from('users').where({id: user_id})
//   .then(data => res.status(200).send(data))
//   .catch(() => res.sendStatus(500))
// })

router.get('/my-account', (req, res) =>{
  const token = req.kauth.grant.access_token.content;

  knex.select('*').from('users').where({email: token.email})
  .then(data => res.status(200).send(data[0]))
  .catch(() => res.sendStatus(500))
})

/*
{
  Headers: Token -- only when using authentication
  Body:{
    email: <user email>
    first_name,
    last_name,
    is_admin,
    is_editor,
    office_id
  }
}
*/
router.patch('/:user_email', async (req, res) =>{
  const { user_email } = req.params;
  const existingUser = await knex.select('*').from('users').where({email: user_email}).then(data => data[0]).catch(() => res.sendStatus(500))

  if(existingUser.email === undefined){
    res.sendStatus(401)
  } else{
    const token = req.kauth.grant.access_token.content;
    const reqUserInfo = await knex.select('*').from('users').where({email: token.email}).then(data => data[0]).catch(() => res.sendStatus(500))

    if(reqUserInfo.office_id === existingUser.office_id && reqUserInfo.is_admin){
      if(Object.keys(req.body).length !== 0){
        knex('users').where({email: user_email}).update({...req.body}, ['*'])
        .then(data => res.status(201).json(data))
        .catch(() => res.sendStatus(500))
      } else{
        res.status(400).send('Request body not complete. Request body should include one or more of the following: \
        { \
          "email": <text>, \
          "first_name": <text>, \
          "last_name": <text>, \
          "is_admin": <boolean>, \
          "is_editor": <boolean>, \
          "office_id": <integer>, \
          "is_deleted": <boolean> \
        }')
      }
    } else{
      res.sendStatus(401)
    }
  }
})

router.delete('/:user_email', async (req, res) =>{
  const { user_email } = req.params;
  const existingUser = await knex.select('*').from('users').where({email: user_email}).then(data => data[0]).catch(() => res.sendStatus(500))

  if(existingUser.email === undefined){
    res.sendStatus(401)
  } else{
    const token = req.kauth.grant.access_token.content;
    const reqUserInfo = await knex.select('*').from('users').where({email: token.email}).then(data => data[0]).catch(() => res.sendStatus(500))

    if(reqUserInfo.office_id === existingUser.office_id && reqUserInfo.is_admin){

      knex('users').where({email: user_email}).update({is_deleted: true}, ['*'])
        .then(data => res.status(200).json(data))
        .catch(() => res.sendStatus(500))
    }
  }
})

module.exports = router;