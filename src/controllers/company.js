const { v4: uuidv4 } = require("uuid")
const Company = require('../models/Company')
const fs = require('fs-extra')
const redis = require('../configs/redis')
const misc = require('../helpers/helper')

module.exports = {

  allWithPagination: async (req, res) => {
    let data, dataAssign, total,
    resultTotal,
    page, search, sort, sortby,
    show, perPage, prevPage, nextPage, offset 

    dataAssign = []
    page = parseInt(req.query.page) || 1
    search = req.query.search || ""
    sort = req.query.sort === "newer" ? "DESC" : "ASC"
    sortby = req.query.filterby === "latest-update" ? "updated_at" : req.query.filterby || "updated_at"
    show = parseInt(req.query.show) || 5
    offset = (page - 1) * show
    
    try {
      total = await Company.total()
      resultTotal = Math.ceil(total[0].total / show)
      perPage = Math.ceil(resultTotal / show)
      prevPage = page === 1 ? 1 : page - 1
      nextPage = page === perPage ? 1 : page + 1
      data = await Company.allv2(offset, show, sort, sortby, search)

      for (let i = 0; i < data.length; i++) {
        let companyObj = {}
        
        const skills = await Company.getSkillsBasedOnProfile(data[i].uid)
        const jobtypes = await Company.getJobTypesBasedOnProfile(data[i].uid)
        const vacancies = await Company.totalVacancies(data[i].company_uid)
        
        companyObj.uid = data[i].uid
        companyObj.slug = data[i].slug
        companyObj.logo = data[i].logo
        companyObj.title = data[i].title
        companyObj.content = data[i].content
        companyObj.salary = data[i].salary
        companyObj.skills = skills
        companyObj.vacancies = vacancies.total
        
        for (let z = 0; z < jobtypes.length; z++) {
          companyObj.jobtypes = jobtypes[z].name
        }

        dataAssign.push(companyObj)
      }

      const pageDetail = {
        total: resultTotal,
        perPage: perPage,
        nextPage: nextPage,
        prevPage: prevPage,
        currentPage: page,
        nextLink: `${process.env.BASE_URL}${req.originalUrl.replace('page=' + page, 'page=' + nextPage)}`,
        prevLink: `${process.env.BASE_URL}${req.originalUrl.replace('page=' + page, 'page=' + prevPage)}`
      }
      misc.responsePagination(res, 200, false, null, pageDetail, dataAssign)
    } catch (err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  allWithInfiniteScroll: async (req, res) => {
    let page, search, sort, sortby, show, offset
    let data
    let dataAssign = []
    
    page = parseInt(req.query.page) || 1
    search = req.query.search || ""
    sort = req.query.sort === "newer" ? "DESC" : "ASC"
    sortby = req.query.filterby === "latest-update" ? "updated_at" : req.query.filterby || "updated_at"
    show = parseInt(req.query.show) || 10
    offset = parseInt(req.query.offset) || 0
    
    try {
      data = await Company.allWithInfiniteScroll(offset, show, sort, sortby, search)
      for (let i = 0; i < data.length; i++) {
        let companyObj = {}
        const skills = await Company.getSkillsBasedOnProfile(data[i].uid)
        const jobtypes = await Company.getJobTypesBasedOnProfile(data[i].uid)
        const vacancies = await Company.totalVacancies(data[i].company_uid)
       
        companyObj.uid = data[i].uid
        companyObj.slug = data[i].slug
        companyObj.logo = data[i].logo
        companyObj.title = data[i].title
        companyObj.content = data[i].content
        companyObj.salary = data[i].salary
        companyObj.skills = skills
        companyObj.vacancies = vacancies.total
        
        for (let z = 0; z < jobtypes.length; z++) {
          companyObj.jobtypes = jobtypes[z].name
        }
        
        dataAssign.push(companyObj)
      }
      misc.responsePagination(res, 200, false, null, null, dataAssign)
    } catch (err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  store: async (req, res) => {
    let logo, filename, ext, fileSize
    let companyObj = {}

    const { name, location, description, email, telephone } = req.body

    try {
      
      if(req.file) {
        filename = req.file.originalname
        ext =  req.file.originalname.split('.').pop()
        fileSize = req.file.fileSize
        if(fileSize >= process.env.IMAGE_SIZE) { 
          fs.unlink(`${process.env.BASE_URL_IMAGE_COMPANY}/${filename}`)
          throw new Error("Oops!, size is too large. Max: 1MB.")
        }
        if(!misc.isImage(ext)) {
          fs.unlink(`${process.env.BASE_URL_IMAGE_COMPANY}/${filename}`)
          throw new Error("Oops! File allowed only JPG, JPEG, PNG, GIF, SVG.")
        }
        logo = req.file.originalname
      } else {
        logo = req.body.logo
      }

      companyObj.logo = logo
      companyObj.name = name
      companyObj.location = location
      companyObj.description = description
      companyObj.email = email
      companyObj.telephone = telephone
      
      await Company.store(companyObj)

      misc.response(res, 200, false, null)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  update: async (req, res) => {
    let logo, filename, ext, fileSize
    let companyUserObj = {}
    let companyObj = {}

    const { uid, userUid, userFullName, userNickname, name, location, description, email, telephone, postJob } = req.body

    try {

      if(userFullName !== "" || userNickname !== "") {
        companyUserObj.fullname = userFullName
        companyUserObj.nickname = userNickname
        await Company.updateUserProfileCompany(companyUserObj, userUid)
      }

      if(req.file) {
        filename = req.file.originalname
        ext = req.file.originalname.split('.').pop()
        fileSize = req.file.fileSize
        if(fileSize >= process.env.IMAGE_SIZE) { 
          fs.unlink(`${process.env.BASE_URL_IMAGE_COMPANY}/${filename}`)
          throw new Error('Oops! Size cannot more than 1MB.')
        }
        if(!misc.isImage(extension)) {
          fs.unlink(`${process.env.BASE_URL_IMAGE_COMPANY}/${filename}`)
          throw new Error('Oops! File allowed only JPG, JPEG, PNG, GIF, SVG.')
        }
        logo = req.file.originalname
      } else {
        logo = req.body.logo
      }
      
      companyObj.logo = logo
      companyObj.name = name
      companyObj.location = location
      companyObj.description = description
      companyObj.email = email
      companyObj.telephone = telephone
 
      await Company.update(companyObj, uid)
  
      misc.response(res, 200, false, null, null)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  edit: async (req, res) => {
    try {
      const companyUid = request.params.uid
      const company = await Company.edit(companyUid)
      misc.response(res, 200, false, null, company)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  delete: async (req, res) => {
    try {
      const companyUid = request.params.Uid
      await Company.delete(companyUid)
      misc.response(res, 200, false, null)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },
  
  getProfile: async (req, res) => {
    let profile, userUid
    let profileObj = {}
    
    userUid = req.body.userUid
    profile = await Company.getProfilev2(userUid)

    try {
      
      profileObj.uid = profile.uid
      profileObj.logo = profile.logo 
      profileObj.title = profile.title
      profileObj.slug = profile.slug
      profileObj.name = profile.name
      profileObj.email = profile.email
      profileObj.content = profile.content
      profileObj.description = profile.description
      profileObj.requirement = profile.requirement
      profileObj.location = profile.location
      profileObj.telephone = profile.telephone
      profileObj.userUid = profile.user_uid

      misc.response(res, 200, false, null, profileObj)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  getProfileBySlug: async (req, res) => {
    let profile, skills, slug
    let profileObj = {}

    slug = req.params.slug

    try {
      
      profile = await Company.getProfileBySlug(slug)
      skills = await Company.getSkillsBasedOnProfile(profile.uid)

      profileObj.title = profile.title
      profileObj.slug = profile.slug
      profileObj.name = profile.name
      profileObj.email = profile.email
      profileObj.location = profile.location
      profileObj.logo = profile.logo
      profileObj.content = profile.content
      profileObj.description = profile.description
      profileObj.telephone = profile.telephone
      profileObj.skills = skills
      profileObj.companyUid = profile.company_uid
      profileObj.userUid = profile.user_uid

      misc.response(res, 200, false, null, profileObj)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  storePostJob: async (req, res) => {
    let postJobUid = uuidv4()
  
    const { title, content, salary, skills, jobtypes, companyUid } = req.body

    for(let i = 0; i < skills.skills.length; i++) {
      // Store Post Job Skills
      await Company.storePostJobSkills(uuidv4(), skills.skills[i].uid, postJobUid)
    }

    // Store Post Job Types
    await Company.storePostJobTypes(uuidv4(), jobtypes.uid, postJobUid)  

    try {
      
      let payload = {
        uid: postJobUid,
        title: title, 
        content: content,
        salary: salary,
        company_uid: companyUid,
        slug: misc.makeid(5)
      }
      
      // Store Post Job 
      await Company.storePostJob(payload)

      misc.response(res, 200, false, null, null)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  editPostJob: async (req, res) => {
    let slug, skills, jobtypes
    let postObj = {}

    slug = req.body.slug  
    postjob = await Company.getProfileBySlug(slug)
    skills = await Company.getSkillsBasedOnProfile(postjob.uid)
    jobtypes = await Company.getJobTypesBasedOnProfile(postjob.uid)

    postObj.uid = postjob.uid
    postObj.title = postjob.title
    postObj.slug = postjob.slug
    postObj.name = postjob.name
    postObj.email = postjob.email
    postObj.salary = postjob.salary
    postObj.location = postjob.location
    postObj.logo = postjob.logo
    postObj.content = postjob.content
    postObj.description = postjob.description
    postObj.telephone = postjob.telephone
    postObj.skills = skills
    postObj.jobtypes = jobtypes

    try {
      misc.response(res, 200, false, null, postObj)
    } catch(err) {
      console.log(err.message) // in-development
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  updatePostJob: async (req, res) => {
    let title, content, slug, postJobUid, skillsStore, skillsDestroy, jobtypesStore

    try {

      title = req.body.payload.title
      content = req.body.payload.content
      slug = misc.slug(req.body.payload.title, true, misc.makeid(5))
      salary = req.body.payload.salary
      postJobUid = req.body.payload.postJobUid
      skillsStore = req.body.payload.skillsStore.skillsSelectedMask
      skillsDestroy = req.body.payload.skillsDestroy.skillsSelectedDestroy
      jobtypesStore = req.body.payload.jobtypes.jobtypesSelectedMask

      // Store Post Job Skills
      for (let i = 0; i < skillsStore.length; i++) {
        let uid = skillsStore[i].uid
        const checkSkills = await Company.checkPostJobSkills(uid, postJobUid)
        if(checkSkills.length === 0) {
          await Company.storePostJobSkills(uuidv4(), uid, postJobUid)
        }
      }

      // Destroy Post Job Skills
      for (let i = 0; i < skillsDestroy.length; i++) {
        for (let z = 0; z < skillsDestroy[i].length; z++) {
          let uid = skillsDestroy[i][z].uid
          await Company.destroyPostJobSkills(uid, postJobUid)
        }
      }

      // Store Post Job Type
      for (let i = 0; i < jobtypesStore.length; i++) {
        let uid = jobtypesStore[i].uid
        await Company.storePostJobTypes(uuidv4(), uid, postJobUid)
      }

      // Update Post Job
      await Company.updatePostJob(title, slug, content, salary, postJobUid)

      misc.response(res, 200, false, null)
    } catch(err) {
      console.log(err.message)
      misc.response(res, 500, true, 'Server Error.')
    }
  },

  dummy: async (req, res) => {
    for (let i = 0; i < 4; i++) {
      let companyObj = {}
      let postJobObj = {}
     
      let companyUid = uuidv4()
      let name = `INJAE COMPANY`
      let logo = `injae.jpg`
      let location = `South Korean`
      let email = `injae@gmail.com`
      let telp = `089670558382`
      let desc = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a ullamcorper est. Proin feugiat quis magna id efficitur. Nullam dictum magna at sapien blandit, ut pharetra nunc scelerisque. Morbi et interdum metus, at pulvinar nunc. Pellentesque malesuada lacus eget nisi tempor, at hendrerit massa accumsan. Etiam placerat luctus lorem ac dictum.`
      let user_uid = `b0ae68a4-fec1-4690-860d-10a6c4307d8c`
      let role = 2

      let postJobUid = uuidv4()
      let title = `Back End Developer ${i + 1}`
      let content = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed a ullamcorper est. Proin feugiat quis magna id efficitur. Nullam dictum magna at sapien blandit, ut pharetra nunc scelerisque. Morbi et interdum metus, at pulvinar nunc. Pellentesque malesuada lacus eget nisi tempor, at hendrerit massa accumsan. Etiam placerat luctus lorem ac dictum.`
      let salary = `${i + 1}0.000.00`
      let slug = `back-end-developer-${i + 1}`
      let createdAt = new Date()
      let updatedAt = new Date()

      companyObj.uid = companyUid
      companyObj.name = name
      companyObj.logo = logo
      companyObj.location = location
      companyObj.email = email
      companyObj.telephone = telp
      companyObj.description = desc
      companyObj.user_uid = user_uid
      companyObj.created_at = createdAt
      companyObj.updated_at = updatedAt

      postJobObj.uid = postJobUid
      postJobObj.title = title
      postJobObj.content = content
      postJobObj.salary = salary
      postJobObj.slug = slug
      postJobObj.company_uid = companyUid
      postJobObj.created_at = createdAt
      postJobObj.updated_at = updatedAt

      await Company.store(companyObj)
      await Company.storePostJob(postJobObj)
    }
    misc.response(res, 200, false, null, null)
  },



}
