#ifdef GL_ES
precision highp float;
#endif

varying vec3 v_Position; // position of vertex
varying vec4 v_Color; // color of vertex
varying vec3 v_Normal; // normal of vertex (NOT NORMALIZED)

uniform vec3 u_LightColor; // light color
uniform vec3 u_LightPosition; // light position
uniform vec3 u_ViewPosition; // view position
uniform float u_ShadingStyle; // shading style

uniform float u_Light; // specific light shading
uniform float u_Selected_Click; // click highlight selection

uniform vec3 u_AmbientColor; // ambient
uniform vec3 u_SpecularColor; // specular
uniform float u_SpecularConstant; // specular constant

void main() {
    if (v_Normal == vec3(1.0) || u_ShadingStyle <= 1.0) {
        gl_FragColor = v_Color;
    } else if(u_ShadingStyle == 2.0) {
        // ambient
        vec3 ambient = u_AmbientColor;

        // diffuse
        vec3 norm = normalize(v_Normal);
        vec3 lightDir = normalize(vec3(v_Position.xy - u_LightPosition.xy, 0.66));
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * vec3(v_Color);

        // specular
        vec3 viewDir = vec3(0.0, 0.0, -1.0);
        vec3 reflectDir = reflect(lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_SpecularConstant);
        vec3 specular = spec * u_SpecularColor;

        // final color calculation
        vec3 result = ambient + diffuse + specular;
        gl_FragColor = vec4(result, v_Color.a);
    } else if(u_ShadingStyle == 3.0) {
        gl_FragColor = vec4(v_Position.zzz * 2.0, v_Color.a);
    } else if(u_ShadingStyle == 4.0) {
        vec3 norm = normalize(v_Normal);
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float dotProduct = dot(norm, viewDir);
        vec3 result = vec3(1.0 - dotProduct);
        gl_FragColor = vec4(result + vec3(v_Color), v_Color.a);
    } else if(u_ShadingStyle == 5.0) {
        float numLevels = 5.0;
        // ambient
        vec3 ambient = u_AmbientColor;

        // diffuse (Quantized to 5 levels)
        vec3 norm = normalize(v_Normal);
        vec3 lightDir = normalize(vec3(v_Position.xy - u_LightPosition.xy, 0.66));
        float diff = max(dot(norm, lightDir), 0.0);
        float diffLevel = floor(diff * numLevels);
        diff = diffLevel / numLevels;
        vec3 diffuse = diff * vec3(v_Color);

        // specular (Quantized to 5 levels)
        vec3 viewDir = vec3(0.0, 0.0, -1.0);
        vec3 reflectDir = reflect(lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_SpecularConstant);
        float specLevel = floor(spec * numLevels);
        spec = specLevel / numLevels;
        vec3 specular = spec * u_SpecularColor;

        // final color calculation
        vec3 result = ambient + diffuse + specular;
        gl_FragColor = vec4(result, v_Color.a);
    }

    if (u_Selected_Click == 1.0) {
        gl_FragColor = vec4(gl_FragColor.rgb + vec3(0.1), v_Color.a);
    }
}
