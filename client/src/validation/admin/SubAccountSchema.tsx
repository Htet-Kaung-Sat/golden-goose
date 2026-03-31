import * as yup from "yup";
import {
  minLengthMsg,
  noCapitalLetterMsg,
  notSpaceMsg,
  passwordMatchMsg,
  requiredMsg,
  noSpecialCharacterMsg,
  integerMsg,
  typeErrorMsg,
  maxValueMsg,
  minValueMsg,
  maxLengthMsg,
} from "../messages/ValidationMessages";

export const SubAccountSchema = yup
  .object({
    is_update: yup.boolean().defined(),
    state: yup.string().trim().required("状态必选"),
    account: yup
      .string()
      .trim()
      .required(requiredMsg())
      .matches(/^\S*$/, notSpaceMsg())
      .matches(/^[^A-Z]*$/, noCapitalLetterMsg())
      .matches(/^[a-zA-Z0-9_ ]*$/, noSpecialCharacterMsg())
      .min(4, minLengthMsg(4))
      .max(255, maxLengthMsg(255)),
    name: yup.string().trim().required(requiredMsg()).max(255, maxLengthMsg(255)),
    login_password: yup.string().defined()
      .max(255, maxLengthMsg(255)),
    password: yup
      .string()
      .defined()
      .max(255, maxLengthMsg(255))
      .when("is_update", {
        is: false,
        // create: must fill, >= 6
        then: (schema) =>
          schema.trim().required(requiredMsg()).min(6, minLengthMsg(6)),
        otherwise: (schema) =>
          // edit: optional, but if filled, >= 6
          schema.test(
            "min-length-if-filled",
            minLengthMsg(6),
            (value) => !value || value.trim() === "" || value.length >= 6,
          ),
      }),
    confirm_password: yup
      .string()
      .defined()
      .max(255, maxLengthMsg(255))
      .when("is_update", {
        is: false,
        then: (schema) =>
          schema.trim().required(requiredMsg()).min(6, minLengthMsg(6)),
        otherwise: (schema) =>
          schema
            .when("password", {
              is: (val: string | undefined) =>
                val != null && String(val).trim() !== "",
              then: (s) => s.required(requiredMsg()),
              otherwise: (s) => s,
            })
            .test(
              "min-length-if-filled",
              minLengthMsg(6),
              (value) => !value || value.trim() === "" || value.length >= 6,
            ),
      })
      .test(
        "match-password",
        passwordMatchMsg("saf_confirm_password", "saf_password"),
        function (value) {
          if (!value) return true;
          const password = String(this.resolve(yup.ref("password")) ?? "");
          if (value.length < 6) return true;
          return value === password;
        },
      ),
    day_limit: yup
      .number()
      .typeError(typeErrorMsg("saf_day", "number"))
      .integer(integerMsg())
      .min(1, minValueMsg(1))
      .max(90, maxValueMsg(90))
      .required(requiredMsg()),
    creator_account: yup.string().defined(),
  })
  .test("passwords-check", "密码验证失败", function (values) {
    const { is_update, login_password, password } = values;

    if (is_update) {
      if (!login_password) {
        return this.createError({
          path: "login_password",
          message: requiredMsg(),
        });
      } else if (login_password.length < 6) {
        return this.createError({
          path: "login_password",
          message: minLengthMsg(6),
        });
      }
    } else {
      if (!password) {
        return this.createError({
          path: "password",
          message: requiredMsg(),
        });
      } else if (password.length < 6) {
        return this.createError({
          path: "password",
          message: minLengthMsg(6),
        });
      }
    }
    return true;
  });
